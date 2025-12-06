import { useEffect, useMemo, useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TablePagination from "@mui/material/TablePagination";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiButton from "components/VuiButton";

// Vision UI Dashboard React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// API
import { detectionAPI } from "services/api";

// Icons
import { IoShield, IoSearch, IoSync, IoDocumentText, IoAnalytics, IoStatsChart } from "react-icons/io5";
import { MdClose } from "react-icons/md";

// Charts
import ReactApexChart from "react-apexcharts";

const STATUS_OPTIONS = ["Investigating", "Resolved", "Escalated"];

const STATUS_COLOR = {
  Investigating: {
    border: "rgba(0, 117, 255, 0.4)",
    text: "#0075ff",
  },
  Resolved: {
    border: "rgba(1, 181, 116, 0.4)",
    text: "#01b574",
  },
  Escalated: {
    border: "rgba(227, 26, 26, 0.4)",
    text: "#e31a1a",
  },
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function DetectAnomalies() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState("detected_at");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedSession, setSelectedSession] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await detectionAPI.getSessions();
      const payload = response.data?.sessions || [];
      setSessions(payload);
      setPage(0);
    } catch (err) {
      console.error("Error fetching detection sessions", err);
      setError(err.response?.data?.detail || "Unable to load detection sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []); // intentionally run once on mount

  const handleRefresh = () => {
    fetchSessions();
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusChange = async (session, newStatus) => {
    setStatusSaving(true);
    try {
      await detectionAPI.updateStatus(session.session_id, {
        status: newStatus,
        notes: selectedSession?.notes || session.notes || "",
      });
      await fetchSessions();
      if (selectedSession && selectedSession.session_id === session.session_id) {
        setSelectedSession(null);
      }
    } catch (err) {
      console.error("Error updating session status", err);
      setError(err.response?.data?.detail || "Unable to update status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleGenerateReport = async (session) => {
    setReportGenerating(true);
    setError("");
    setSuccess("");
    try {
      const response = await detectionAPI.generateReport(session.session_id);
      const reportData = response.data;
      
      if (reportData?.file_path) {
        // Create and download the report
        const reportContent = JSON.stringify(reportData, null, 2);
        const blob = new Blob([reportContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `detection_report_${session.session_id}_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        setSuccess("Report generated and downloaded successfully!");
      } else {
        setError("Report generation failed: No data returned");
      }
    } catch (err) {
      console.error("Error generating report", err);
      setError(err.response?.data?.detail || "Unable to generate report. Please try again.");
    } finally {
      setReportGenerating(false);
    }
  };

  // Aggregate raw sessions by file + model so the table shows one row per detection run
  const aggregatedSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const groups = new Map();

    sessions.forEach((session) => {
      const key = `${session.file_name || "Unknown file"}|${session.model_type || "Unknown model"}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          ...session,
          session_ids: [session.session_id],
          total_events: session.total_events || 0,
          anomaly_count: session.anomaly_count || 0,
          risk_high: session.risk_high || 0,
          risk_medium: session.risk_medium || 0,
          risk_low: session.risk_low || 0,
          anomalies: [...(session.anomalies || [])],
        });
      } else {
        existing.session_ids.push(session.session_id);
        existing.total_events += session.total_events || 0;
        existing.anomaly_count += session.anomaly_count || 0;
        existing.risk_high += session.risk_high || 0;
        existing.risk_medium += session.risk_medium || 0;
        existing.risk_low += session.risk_low || 0;
        existing.anomalies = [...existing.anomalies, ...(session.anomalies || [])];

        // Prefer the most recent detection metadata for status / timestamps / actions
        if (new Date(session.detected_at) > new Date(existing.detected_at)) {
          existing.detected_at = session.detected_at;
          existing.status = session.status;
          existing.notes = session.notes;
          existing.session_id = session.session_id;
        }
      }
    });

    // Recompute average risk based on merged anomalies
    const result = Array.from(groups.values()).map((group) => {
      const anomalyCount = group.anomalies?.length || 0;
      // Keep anomaly_count in sync with the actual anomalies list length
      group.anomaly_count = anomalyCount;
      if (anomalyCount > 0) {
        const totalRisk = group.anomalies.reduce(
          (sum, item) => sum + (item.risk_score || 0),
          0
        );
        group.risk_average = Number((totalRisk / anomalyCount).toFixed(2));
      } else {
        group.risk_average = 0;
      }
      return group;
    });

    // Sort by most recent detection first
    result.sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at));
    return result;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const sorted = [...aggregatedSessions].sort((a, b) => {
      let comparison = 0;

      if (orderBy === "detected_at") {
        comparison = new Date(a.detected_at) - new Date(b.detected_at);
      } else if (orderBy === "anomaly_count") {
        comparison = a.anomaly_count - b.anomaly_count;
      } else if (orderBy === "status") {
        comparison = (a.status || "").localeCompare(b.status || "");
      } else {
        comparison = (a[orderBy] || "").toString().localeCompare((b[orderBy] || "").toString());
      }

      return order === "asc" ? comparison : -comparison;
    });

    if (!normalizedSearch) {
      return sorted;
    }

    return sorted.filter((session) =>
      [
        session.file_name,
        session.model_type,
        session.description,
        session.status,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [aggregatedSessions, searchTerm, order, orderBy]);

  const paginatedSessions = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredSessions.slice(start, start + rowsPerPage);
  }, [filteredSessions, page, rowsPerPage]);

  const totals = useMemo(() => {
    const totalAnomalies = aggregatedSessions.reduce(
      (sum, session) => sum + (session.anomaly_count || 0),
      0
    );
    const highRisk = aggregatedSessions.filter((session) => (session.risk_high || 0) > 0).length;
    return {
      sessions: aggregatedSessions.length,
      anomalies: totalAnomalies,
      highRisk,
    };
  }, [aggregatedSessions]);

  const drawerChart = useMemo(() => {
    if (!selectedSession) return { series: [], options: {} };
    const riskCounts = {
      high: selectedSession.risk_high || 0,
      medium: selectedSession.risk_medium || 0,
      low: selectedSession.risk_low || 0,
    };
    return {
      series: [
        {
          name: "Risk Count",
          data: [riskCounts.high, riskCounts.medium, riskCounts.low],
        },
      ],
      options: {
        chart: {
          type: "bar",
          toolbar: { show: false },
          background: "transparent",
        },
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 6,
            barHeight: "60%",
            distributed: true,
          },
        },
        colors: ["#e31a1a", "#ffb547", "#01b574"],
        xaxis: {
          categories: ["High", "Medium", "Low"],
          labels: { style: { colors: "#c8cfca", fontSize: "12px" } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          labels: { style: { colors: "#c8cfca", fontSize: "12px" } },
        },
        grid: {
          borderColor: "rgba(200, 207, 202, 0.2)",
        },
        tooltip: {
          theme: "dark",
        },
        legend: {
          show: false,
        },
      },
    };
  }, [selectedSession]);

  const renderStatusChip = (sessionId) => {
    const session = sessions.find((item) => item.session_id === sessionId);
    const status = session?.status || "Investigating";
    const colors = STATUS_COLOR[status] || STATUS_COLOR.Investigating;
    return (
      <Chip
        label={status}
        variant="outlined"
        sx={{
          borderColor: colors.border,
          color: colors.text,
          fontWeight: 600,
          textTransform: "capitalize",
          minWidth: "120px",
        }}
      />
    );
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <VuiBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <VuiBox p={3} display="flex" flexDirection={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} gap={2}>
                <VuiBox display="flex" alignItems="center" gap={2}>
                  <VuiBox
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    width="48px"
                    height="48px"
                    borderRadius="lg"
                    sx={{ backgroundColor: "rgba(0, 117, 255, 0.1)" }}
                  >
                    <IoShield size="22px" color="#0075ff" />
                  </VuiBox>
                  <VuiBox>
                    <VuiTypography variant="h4" color="white" fontWeight="bold">
                      Detected Anomalies
                    </VuiTypography>
                    <VuiTypography variant="body2" color="text">
                      SOC overview of every detection session, anomalies, and remediation status.
                    </VuiTypography>
                  </VuiBox>
                </VuiBox>
              </VuiBox>
              <Divider sx={{ borderColor: "rgba(200, 207, 202, 0.1)" }} />
              <VuiBox p={3} display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }} gap={2}>
                <Card sx={{ p: 2, background: "rgba(6, 11, 40, 0.6)" }}>
                  <VuiTypography variant="button" color="text" fontWeight="medium" mb="4px">
                    Detection Sessions
                  </VuiTypography>
                  <VuiTypography variant="h4" color="white" fontWeight="bold">
                    {totals.sessions}
                  </VuiTypography>
                </Card>
                <Card sx={{ p: 2, background: "rgba(6, 11, 40, 0.6)" }}>
                  <VuiTypography variant="button" color="text" fontWeight="medium" mb="4px">
                    Anomalies Flagged
                  </VuiTypography>
                  <VuiTypography variant="h4" color="white" fontWeight="bold">
                    {totals.anomalies}
                  </VuiTypography>
                </Card>
                <Card sx={{ p: 2, background: "rgba(6, 11, 40, 0.6)" }}>
                  <VuiTypography variant="button" color="text" fontWeight="medium" mb="4px">
                    High-Risk Sessions
                  </VuiTypography>
                  <VuiTypography variant="h4" color="white" fontWeight="bold">
                    {totals.highRisk}
                  </VuiTypography>
                </Card>
              </VuiBox>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <VuiBox p={3} display="flex" flexDirection={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} gap={2}>
                <VuiTypography variant="lg" color="white" fontWeight="bold">
                  Detection Sessions
                </VuiTypography>
                <VuiBox display="flex" gap={2} flexWrap="wrap">
                  <TextField
                    placeholder="Search by file, model, status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{
                      minWidth: "260px",
                      "& .MuiOutlinedInput-root": {
                        color: "#fff",
                        backgroundColor: "rgba(6, 11, 40, 0.6)",
                        borderRadius: "12px",
                        "& fieldset": {
                          borderColor: "rgba(200, 207, 202, 0.2)",
                        },
                        "&:hover fieldset": {
                          borderColor: "rgba(0, 117, 255, 0.6)",
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IoSearch size="18px" color="#c8cfca" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Tooltip title="Refresh sessions">
                    <IconButton
                      aria-label="Refresh detection sessions"
                      onClick={handleRefresh}
                      color="primary"
                      sx={{ backgroundColor: "rgba(0, 117, 255, 0.1)" }}
                    >
                      <IoSync size="18px" color="#0075ff" />
                    </IconButton>
                  </Tooltip>
                </VuiBox>
              </VuiBox>

              {(error || success) && (
                <VuiBox px={3} pb={2}>
                  {error && (
                    <VuiTypography variant="caption" color="error" display="block">
                      {error}
                    </VuiTypography>
                  )}
                  {success && (
                    <VuiTypography variant="caption" color="success" display="block">
                      {success}
                    </VuiTypography>
                  )}
                </VuiBox>
              )}


              <TableContainer
                sx={{
                  maxHeight: 500,
                  overflowY: "auto",
                  overflowX: "auto",
                  backgroundColor: "#020617", // dark navy background behind table
                  borderRadius: "0 0 16px 16px",
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(6, 11, 40, 0.5)',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0, 117, 255, 0.5)',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: 'rgba(0, 117, 255, 0.7)',
                  },
                }}
              >
                <Table
                  stickyHeader
                  sx={{
                    width: "100%",
                    tableLayout: "fixed",
                    "& .MuiTableCell-root": {
                      color: "#ffffff !important",
                      padding: "16px",
                      fontSize: "0.875rem",
                    },
                    "& .MuiTableBody-root .MuiTableCell-root": {
                      backgroundColor: "#020617 !important",
                      borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
                    },
                    "& .MuiTableHead-root .MuiTableCell-root": {
                      backgroundColor: "#0a1628 !important",
                      fontWeight: 600,
                      borderBottom: "2px solid rgba(148, 163, 184, 0.35)",
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sortDirection={orderBy === "detectedAt" ? order : false}
                        sx={{ width: "18%" }}
                      >
                        <TableSortLabel
                          active={orderBy === "detected_at"}
                          direction={orderBy === "detected_at" ? order : "asc"}
                          onClick={() => handleSort("detected_at")}
                        >
                          Date / Time
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ width: "15%" }}>
                        Detection Type
                      </TableCell>
                      <TableCell sx={{ width: "12%" }}>
                        Total Events
                      </TableCell>
                      <TableCell
                        sortDirection={orderBy === "anomaly_count" ? order : false}
                        sx={{ width: "12%" }}
                      >
                        <TableSortLabel
                          active={orderBy === "anomaly_count"}
                          direction={orderBy === "anomaly_count" ? order : "asc"}
                          onClick={() => handleSort("anomaly_count")}
                        >
                          Anomalies
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ width: "25%" }}>
                        Description
                      </TableCell>
                      <TableCell
                        sortDirection={orderBy === "status" ? order : false}
                        sx={{ width: "10%" }}
                      >
                        <TableSortLabel
                          active={orderBy === "status"}
                          direction={orderBy === "status" ? order : "asc"}
                          onClick={() => handleSort("status")}
                        >
                          Status
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ width: "18%" }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                          <CircularProgress size={36} color="info" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6, backgroundColor: "rgba(6, 11, 40, 0.8)" }}>
                          <VuiTypography variant="body2" color="text">
                            No detection sessions match your filters.
                          </VuiTypography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSessions.map((session) => (
                        <TableRow
                          key={session.session_id}
                          hover
                          sx={{
                            backgroundColor: "rgba(6, 11, 40, 0.9)",
                            '&:nth-of-type(even)': {
                              backgroundColor: "rgba(10, 18, 50, 0.95)",
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>
                            {formatDate(session.detected_at)}
                          </TableCell>
                          <TableCell>
                            {session.model_type}
                          </TableCell>
                          <TableCell>
                            {session.total_events}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {session.anomaly_count}
                          </TableCell>
                          <TableCell
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Tooltip title={session.description} placement="top" arrow>
                              <span>{session.description}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {renderStatusChip(session.session_id)}
                          </TableCell>
                          <TableCell align="right">
                            <VuiBox display="flex" gap={1} justifyContent="flex-end">
                              <VuiButton color="info" size="small" onClick={() => setSelectedSession(session)}>
                                View Details
                              </VuiButton>
                              <VuiButton
                                color="secondary"
                                size="small"
                                onClick={() => handleGenerateReport(session)}
                                disabled={reportGenerating}
                              >
                                {reportGenerating ? "Exporting..." : "Export JSON Report"}
                              </VuiButton>
                            </VuiBox>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredSessions.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{ color: "#c8cfca" }}
              />
            </Card>
          </Grid>
        </Grid>
      </VuiBox>
      <Footer />

      <Drawer anchor="right" open={Boolean(selectedSession)} onClose={() => setSelectedSession(null)} PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, backgroundColor: "#0f1535", color: "#fff" } }}>
        {selectedSession && (
          <VuiBox height="100%" display="flex" flexDirection="column">
            <VuiBox display="flex" alignItems="center" justifyContent="space-between" p={3}>
              <VuiBox>
                <VuiTypography variant="h5" color="white" fontWeight="bold">
                  Session #{selectedSession.session_id}
                </VuiTypography>
                <VuiTypography variant="button" color="text">
                  {formatDate(selectedSession.detected_at)} · {selectedSession.model_type}
                </VuiTypography>
              </VuiBox>
              <IconButton
                aria-label="Close session details"
                onClick={() => setSelectedSession(null)}
                color="inherit"
              >
                <MdClose size="20px" />
              </IconButton>
            </VuiBox>
            <Divider sx={{ borderColor: "rgba(200, 207, 202, 0.15)" }} />

            <VuiBox p={3} display="grid" gap={2}>
              <Card sx={{ p: 2, background: "rgba(6, 11, 40, 0.6)" }}>
                <VuiTypography variant="button" color="text" fontWeight="medium">
                  Summary
                </VuiTypography>
                <VuiBox display="grid" gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap={2} mt={2}>
                  <VuiBox>
                    <VuiTypography variant="button" color="text" mb="2px">
                      Total Events
                    </VuiTypography>
                    <VuiTypography variant="h5" color="white" fontWeight="bold">
                      {selectedSession.total_events}
                    </VuiTypography>
                  </VuiBox>
                  <VuiBox>
                    <VuiTypography variant="button" color="text" mb="2px">
                      Anomalies
                    </VuiTypography>
                    <VuiTypography variant="h5" color="white" fontWeight="bold">
                      {selectedSession.anomaly_count}
                    </VuiTypography>
                  </VuiBox>
                  <VuiBox>
                    <VuiTypography variant="button" color="text" mb="2px">
                      Avg. Risk Score
                    </VuiTypography>
                    <VuiTypography variant="h5" color="white" fontWeight="bold">
                      {selectedSession.risk_average}
                    </VuiTypography>
                  </VuiBox>
                  <VuiBox>
                    <VuiTypography variant="button" color="text" mb="2px">
                      Current Status
                    </VuiTypography>
                    <VuiBox display="flex" gap={1}>
                      {renderStatusChip(selectedSession.session_id)}
                    </VuiBox>
                  </VuiBox>
                </VuiBox>
              </Card>

              <Card sx={{ p: 2, background: "rgba(6, 11, 40, 0.6)" }}>
                <VuiTypography variant="button" color="text" fontWeight="medium" mb={1} display="flex" alignItems="center" gap={1}>
                  <IoAnalytics size="16px" /> Risk Distribution
                </VuiTypography>
                {selectedSession.anomaly_count === 0 ? (
                  <VuiTypography variant="caption" color="text">
                    No anomalies detected in this session.
                  </VuiTypography>
                ) : (
                  <ReactApexChart options={drawerChart.options} series={drawerChart.series} type="bar" height={220} />
                )}
              </Card>

              <Card sx={{ p: 2, background: "rgba(6, 11, 40, 0.6)" }}>
                <VuiTypography variant="button" color="text" fontWeight="medium" mb={2} display="flex" alignItems="center" gap={1}>
                  <IoStatsChart size="16px" /> Anomalies ({selectedSession.anomalies.length})
                </VuiTypography>
                {selectedSession.anomalies.length === 0 ? (
                  <VuiTypography variant="caption" color="text">
                    No anomalous events recorded.
                  </VuiTypography>
                ) : (
                  <VuiBox display="flex" flexDirection="column" gap={1.5} maxHeight="220px" overflow="auto">
                    {selectedSession.anomalies.map((item) => (
                      <Card key={item.id} sx={{ p: 1.5, background: "rgba(15, 21, 53, 0.8)" }}>
                        <VuiTypography variant="button" color="white" fontWeight="medium">
                          Risk {item.risk_level?.toUpperCase() || "UNKNOWN"} · Score {Number(item.risk_score || 0).toFixed(2)}
                        </VuiTypography>
                        <VuiTypography variant="caption" color="text">
                          timestamp: {formatDate(item.detected_at)}
                        </VuiTypography>
                        <VuiTypography variant="caption" color="text" display="block" mt={0.5}>
                          {item.explanation || "No explanation provided."}
                        </VuiTypography>
                      </Card>
                    ))}
                  </VuiBox>
                )}
              </Card>

              <Card sx={{ p: 2, background: "rgba(6, 11, 40, 0.6)" }}>
                <VuiTypography variant="button" color="white" fontWeight="medium" mb={2}>
                  Update Status
                </VuiTypography>
                <VuiBox display="flex" gap={1} flexWrap="wrap">
                  {STATUS_OPTIONS.map((optionStatus) => {
                    const isActive = selectedSession.status === optionStatus;
                    const colorMap = {
                      Investigating: { bg: "#0075FF", border: "#0075FF" },
                      Resolved: { bg: "#10b981", border: "#10b981" },
                      Escalated: { bg: "#f87171", border: "#f87171" },
                    };
                    const colors = colorMap[optionStatus] || colorMap.Investigating;
                    
                    return (
                      <VuiButton
                        key={optionStatus}
                        size="small"
                        disabled={statusSaving}
                        onClick={() => handleStatusChange(selectedSession, optionStatus)}
                        sx={{
                          backgroundColor: isActive ? colors.bg : "transparent",
                          border: `2px solid ${colors.border}`,
                          color: isActive ? "#ffffff" : colors.border,
                          fontWeight: 600,
                          minWidth: "100px",
                          "&:hover": {
                            backgroundColor: isActive ? colors.bg : `${colors.bg}33`,
                            borderColor: colors.border,
                          },
                        }}
                      >
                        {optionStatus}
                      </VuiButton>
                    );
                  })}
                </VuiBox>
                <VuiTypography variant="caption" color="text" mt={1.5} display="block">
                  Last updated: {formatDate(selectedSession.detected_at)}
                </VuiTypography>
                <VuiButton
                  fullWidth
                  color="info"
                  sx={{ mt: 2 }}
                  disabled={reportGenerating}
                  onClick={() => handleGenerateReport(selectedSession)}
                >
                  {reportGenerating ? "Exporting..." : "Export JSON Report"}
                </VuiButton>
              </Card>
            </VuiBox>
          </VuiBox>
        )}
      </Drawer>
    </DashboardLayout>
  );
}

export default DetectAnomalies;
