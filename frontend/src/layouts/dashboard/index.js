import { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";

// Vision UI components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MiniStatisticsCard from "examples/Cards/StatisticsCards/MiniStatisticsCard";
import LineChart from "examples/Charts/LineCharts/LineChart";
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiButton from "components/VuiButton";

// Dashboard widgets
import WelcomeMark from "layouts/dashboard/components/WelcomeMark";
import AnomalyBreakdownCard from "layouts/dashboard/components/AnomalyBreakdownCard";

// Icons
import { IoPeople, IoDocumentText, IoWarning, IoShield } from "react-icons/io5";

// API
import { analyticsAPI, detectionAPI } from "services/api";

const KPI_CONFIG = (
  stats,
  loading
) => [
  {
    key: "accounts",
    title: "Users Monitored",
    value: stats?.total_users ?? 0,
    icon: <IoPeople size="22px" color="#fff" />,
    description: "Total unique users with activity logs"
  },
  {
    key: "logs",
    title: "Log Entries",
    value: stats?.total_logs ?? 0,
    icon: <IoDocumentText size="22px" color="#fff" />,
    description: "Total activity records uploaded"
  },
  {
    key: "anomalies",
    title: "Anomalies Found",
    value: stats?.anomalies_detected ?? 0,
    icon: <IoWarning size="22px" color="#fff" />,
    description: "Suspicious activities detected"
  },
  {
    key: "high-risk",
    title: "High-Risk Users",
    value: stats?.high_risk_users ?? 0,
    icon: <IoShield size="22px" color="#fff" />,
    description: "Users with critical threats"
  },
].map((item) => ({
  ...item,
  loading,
}));

const formatTimestamp = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
};

const riskBadge = (level) => {
  const palette = {
    high: { label: "High", color: "#FED7D7", bg: "rgba(254,215,215,0.16)" },
    medium: { label: "Medium", color: "#F6C065", bg: "rgba(246,192,101,0.16)" },
    low: { label: "Low", color: "#68D391", bg: "rgba(104,211,145,0.16)" },
  };

  const entry = palette[(level || "low").toLowerCase()] ?? palette.low;
  return (
    <Chip
      label={entry.label}
      size="small"
      sx={{
        fontSize: "0.7rem",
        fontWeight: 600,
        color: entry.color,
        backgroundColor: entry.bg,
        textTransform: "uppercase",
      }}
    />
  );
};

function Dashboard() {
  const history = useHistory();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [trends, setTrends] = useState([]);
  const [trendRange, setTrendRange] = useState(14);
  const [loadingTrends, setLoadingTrends] = useState(true);

  const [recentDetections, setRecentDetections] = useState([]);
  const [loadingDetections, setLoadingDetections] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await analyticsAPI.getStats();
        setStats(response.data ?? null);
      } catch (error) {
        console.error("Failed to load analytics stats", error);
        setStats(null);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoadingTrends(true);
      try {
        const response = await analyticsAPI.getTrends(14);
        setTrends(response.data?.points ?? []);
        setTrendRange(response.data?.range_days ?? 14);
      } catch (error) {
        console.error("Failed to load anomaly trends", error);
        setTrends([]);
      } finally {
        setLoadingTrends(false);
      }
    };

    fetchTrends();
  }, []);


  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await detectionAPI.getResults(8);
        setRecentDetections(response.data?.results ?? []);
      } catch (error) {
        console.error("Failed to load recent detections", error);
        setRecentDetections([]);
      } finally {
        setLoadingDetections(false);
      }
    };

    fetchDetections();
  }, []);

  const trendCategories = useMemo(
    () =>
      trends.map((point) => {
        const date = new Date(point.date);
        if (Number.isNaN(date.getTime())) {
          return point.date;
        }
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      }),
    [trends]
  );

  const lineChartData = useMemo(
    () => [
      {
        name: "Anomalies",
        data: trends.map((point) => point.anomalies ?? 0),
      },
      {
        name: "Normal activity",
        data: trends.map((point) => point.normal ?? 0),
      },
    ],
    [trends]
  );

  const lineChartOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
      },
      tooltip: { theme: "dark" },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      grid: { strokeDashArray: 5, borderColor: "#56577A" },
      legend: {
        labels: { colors: "#c8cfca" },
      },
      xaxis: {
        type: "category",
        categories: trendCategories,
        labels: {
          style: { colors: "#c8cfca", fontSize: "10px" },
          rotate: 0,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#c8cfca", fontSize: "10px" },
        },
      },
      colors: ["#f87171", "#2CD9FF"],
      fill: {
        type: "gradient",
        gradient: {
          shade: "dark",
          type: "vertical",
          shadeIntensity: 0.4,
          opacityFrom: 0.7,
          opacityTo: 0.1,
          stops: [0, 100],
        },
      },
    }),
    [trendCategories]
  );

  const monitoredAccounts = stats?.total_users ?? 0;
  const anomaliesPastWeek = stats?.anomalies_past_week ?? 0;
  const modelsTrained = stats?.models_trained ?? 0;

  const recentDetectionsContent = loadingDetections ? (
    <Stack spacing={1.5}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          variant="rectangular"
          height={58}
          sx={{ borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.08)" }}
        />
      ))}
    </Stack>
  ) : recentDetections.length > 0 ? (
    <Stack spacing={1.5}>
      {recentDetections.map((detection) => (
        <VuiBox
          key={detection.id}
          px={2}
          py={1.5}
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{ backgroundColor: "rgba(27, 36, 64, 0.75)" }}
        >
          <VuiBox>
            <VuiTypography color="white" variant="button" fontWeight="medium">
              {detection.model_type || "Unknown model"}
            </VuiTypography>
            <VuiTypography color="text" variant="caption">
              Session #{detection.log_entry_id ?? "—"} · {formatTimestamp(detection.detected_at)}
            </VuiTypography>
          </VuiBox>
          <Stack direction="row" spacing={1} alignItems="center">
            {riskBadge(detection.risk_level)}
            <VuiTypography color="text" variant="caption">
              Score: {typeof detection.anomaly_score === "number" ? detection.anomaly_score.toFixed(2) : "—"}
            </VuiTypography>
          </Stack>
        </VuiBox>
      ))}
    </Stack>
  ) : (
    <VuiTypography color="text" variant="caption">
      No detections recorded yet. Run a detection session to populate this list.
    </VuiTypography>
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <VuiBox py={3}>
        <VuiBox mb={3}>
          <Grid container spacing={3}>
            {KPI_CONFIG(stats, loadingStats).map(({ key, title, value, icon, loading }) => (
              <Grid item xs={12} sm={6} xl={3} key={key}>
                <MiniStatisticsCard
                  title={{ text: title, fontWeight: "regular" }}
                  count={loading ? "—" : value.toLocaleString?.() ?? String(value)}
                  percentage={{ color: "info", text: "" }}
                  icon={{ color: "info", component: icon }}
                  direction="right"
                />
              </Grid>
            ))}
          </Grid>
        </VuiBox>

        <VuiBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={6} xl={5}>
              <WelcomeMark
                stats={{
                  monitoredAccounts,
                  anomaliesPastWeek,
                  modelsTrained,
                }}
                loading={loadingStats}
                onViewAlerts={() => history.push("/detect")}
              />
            </Grid>
            <Grid item xs={12} lg={6} xl={7}>
              <AnomalyBreakdownCard stats={stats ?? undefined} loading={loadingStats} />
            </Grid>
          </Grid>
        </VuiBox>

        <VuiBox mb={3}>
          <Card>
            <VuiBox p={3}>
              <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <VuiBox>
                  <VuiTypography variant="lg" color="white" fontWeight="bold" mb="4px">
                    Anomaly trends
                  </VuiTypography>
                  <VuiTypography variant="caption" color="text">
                    Activity over the last {trendRange} days
                  </VuiTypography>
                </VuiBox>
                <VuiButton
                  color="info"
                  size="small"
                  onClick={() => history.push("/analytics")}
                  sx={{ textTransform: "none" }}
                >
                  View Detailed Analytics →
                </VuiButton>
              </VuiBox>
              {loadingTrends ? (
                <Skeleton
                  variant="rectangular"
                  height={320}
                  sx={{ borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.08)" }}
                />
              ) : (
                <VuiBox sx={{ height: { xs: 260, md: 380 } }}>
                  <LineChart lineChartData={lineChartData} lineChartOptions={lineChartOptions} />
                </VuiBox>
              )}
            </VuiBox>
          </Card>
        </VuiBox>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <VuiBox p={3}>
                <VuiTypography variant="lg" color="white" fontWeight="bold" mb="6px">
                  Recent detection activity
                </VuiTypography>
                <VuiTypography variant="caption" color="text" mb={2}>
                  Latest results returned by the detection pipeline
                </VuiTypography>
                <VuiBox sx={{ maxHeight: '400px', overflowY: 'auto', pr: 1 }}>
                  {recentDetectionsContent}
                </VuiBox>
              </VuiBox>
            </Card>
          </Grid>
        </Grid>
      </VuiBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Dashboard;
