import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

// Vision UI components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiButton from "components/VuiButton";
import MiniStatisticsCard from "examples/Cards/StatisticsCards/MiniStatisticsCard";

// Charts
import LineChart from "examples/Charts/LineCharts/LineChart";
import BarChart from "examples/Charts/BarCharts/BarChart";

// Icons
import { 
  IoStatsChart, 
  IoPeople, 
  IoWarning, 
  IoShield,
  IoArrowForward,
  IoRefresh
} from "react-icons/io5";

// API
import { analyticsAPI, detectionAPI } from "services/api";

function Analytics() {
  const history = useHistory();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [riskUsers, setRiskUsers] = useState([]);
  const [loadingRiskUsers, setLoadingRiskUsers] = useState(true);
  const [trends, setTrends] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(true);

  const fetchData = async () => {
    // Fetch stats
    setLoadingStats(true);
    try {
      const statsResponse = await analyticsAPI.getStats();
      setStats(statsResponse.data);
    } catch (error) {
      console.error("Failed to load stats", error);
    } finally {
      setLoadingStats(false);
    }

    // Fetch risk users
    setLoadingRiskUsers(true);
    try {
      const riskResponse = await analyticsAPI.getUserRiskScores();
      setRiskUsers(riskResponse.data?.items || []);
    } catch (error) {
      console.error("Failed to load risk users", error);
    } finally {
      setLoadingRiskUsers(false);
    }

    // Fetch trends
    setLoadingTrends(true);
    try {
      const trendsResponse = await analyticsAPI.getTrends(30);
      setTrends(trendsResponse.data?.points || []);
    } catch (error) {
      console.error("Failed to load trends", error);
    } finally {
      setLoadingTrends(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Prepare chart data
  const trendCategories = trends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const anomalyData = trends.map(t => t.anomalies);
  const normalData = trends.map(t => t.normal);

  const lineChartData = [
    {
      name: "Anomalies",
      data: anomalyData,
    },
    {
      name: "Normal",
      data: normalData,
    },
  ];

  const lineChartOptions = {
    chart: {
      toolbar: { show: false },
    },
    tooltip: {
      theme: "dark",
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    xaxis: {
      categories: trendCategories,
      labels: {
        style: { colors: "#c8cfca", fontSize: "10px" },
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
      },
    },
    grid: {
      borderColor: "rgba(226, 232, 240, 0.1)",
    },
  };

  // Risk distribution data
  const highRisk = stats?.high_risk_users || 0;
  const totalUsers = stats?.total_users || 0;

  // When there are no monitored users yet, keep all buckets at 0
  let mediumRisk = 0;
  let lowRisk = 0;

  if (totalUsers > 0) {
    mediumRisk = Math.max(0, Math.floor(totalUsers * 0.3) - highRisk);
    lowRisk = Math.max(0, totalUsers - highRisk - mediumRisk);
  }

  // User risk scores bar chart - formatted for ApexCharts
  const topRiskUsers = riskUsers.slice(0, 10);
  
  const barChartData = [
    {
      name: "Risk Score",
      data: topRiskUsers.map(u => u.risk_score || 0),
    },
  ];

  const barChartOptions = {
    chart: {
      toolbar: { show: false },
    },
    tooltip: {
      theme: "dark",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        distributed: true,
      },
    },
    colors: topRiskUsers.map(u => {
      const level = (u.risk_level || '').toLowerCase();
      if (level === 'high') return '#f87171';
      if (level === 'medium') return '#f59e0b';
      return '#10b981';
    }),
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: topRiskUsers.map(u => u.user_id || 'Unknown'),
      labels: {
        style: { colors: "#c8cfca", fontSize: "11px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#c8cfca", fontSize: "10px" },
      },
    },
    grid: {
      borderColor: "rgba(226, 232, 240, 0.1)",
    },
    legend: {
      show: false,
    },
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <VuiBox py={3}>
        {/* Header */}
        <VuiBox mb={3} display="flex" justifyContent="space-between" alignItems="center">
          <VuiBox>
            <VuiTypography variant="h3" color="white" fontWeight="bold">
              Insider Threat Analytics
            </VuiTypography>
            <VuiTypography variant="body2" color="text">
              Comprehensive analysis of user behavior and anomaly detection
            </VuiTypography>
          </VuiBox>
          <Tooltip title="Refresh data">
            <IconButton onClick={fetchData} sx={{ color: "#0075FF" }}>
              <IoRefresh size="24px" />
            </IconButton>
          </Tooltip>
        </VuiBox>

        {/* KPI Cards */}
        <VuiBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} xl={3}>
              <MiniStatisticsCard
                title={{ text: "Total Users Monitored" }}
                count={loadingStats ? "—" : (stats?.total_users || 0).toLocaleString()}
                icon={{ color: "info", component: <IoPeople size="22px" /> }}
                direction="right"
              />
            </Grid>
            <Grid item xs={12} sm={6} xl={3}>
              <MiniStatisticsCard
                title={{ text: "High-Risk Accounts" }}
                count={loadingStats ? "—" : (stats?.high_risk_users || 0).toLocaleString()}
                icon={{ color: "error", component: <IoShield size="22px" /> }}
                direction="right"
              />
            </Grid>
            <Grid item xs={12} sm={6} xl={3}>
              <MiniStatisticsCard
                title={{ text: "Anomalies Detected" }}
                count={loadingStats ? "—" : (stats?.anomalies_detected || 0).toLocaleString()}
                icon={{ color: "warning", component: <IoWarning size="22px" /> }}
                direction="right"
              />
            </Grid>
            <Grid item xs={12} sm={6} xl={3}>
              <MiniStatisticsCard
                title={{ text: "Detection Rate" }}
                count={loadingStats ? "—" : `${Math.round(((stats?.anomalies_detected || 0) / Math.max(stats?.total_logs || 1, 1)) * 100)}%`}
                icon={{ color: "success", component: <IoStatsChart size="22px" /> }}
                direction="right"
              />
            </Grid>
          </Grid>
        </VuiBox>

        {/* Charts Row 1 */}
        <VuiBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Card>
                <VuiBox p={3}>
                  <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <VuiBox>
                      <VuiTypography variant="lg" color="white" fontWeight="bold">
                        Anomaly Trends (30 Days)
                      </VuiTypography>
                      <VuiTypography variant="caption" color="text">
                        Daily anomaly detection patterns
                      </VuiTypography>
                    </VuiBox>
                  </VuiBox>
                  {loadingTrends ? (
                    <Skeleton variant="rectangular" height={350} sx={{ borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.08)" }} />
                  ) : (
                    <VuiBox sx={{ height: 350 }}>
                      <LineChart lineChartData={lineChartData} lineChartOptions={lineChartOptions} />
                    </VuiBox>
                  )}
                </VuiBox>
              </Card>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Card sx={{ height: "100%" }}>
                <VuiBox p={3} display="flex" flexDirection="column" height="100%">
                  <VuiTypography variant="lg" color="white" fontWeight="bold" mb={3}>
                    Risk Distribution
                  </VuiTypography>
                  {loadingStats ? (
                    <VuiBox display="flex" flexDirection="column" gap={2}>
                      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.08)" }} />
                      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.08)" }} />
                      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.08)" }} />
                    </VuiBox>
                  ) : (
                    <VuiBox display="flex" flexDirection="column" gap={2} flexGrow={1} justifyContent="center">
                      {/* High Risk */}
                      <VuiBox
                        p={2}
                        sx={{
                          backgroundColor: "rgba(248, 113, 113, 0.15)",
                          borderRadius: "12px",
                          border: "1px solid rgba(248, 113, 113, 0.3)",
                        }}
                      >
                        <VuiBox display="flex" justifyContent="space-between" alignItems="center">
                          <VuiTypography variant="button" color="white" fontWeight="medium">
                            High Risk
                          </VuiTypography>
                          <VuiTypography variant="h4" color="error" fontWeight="bold">
                            {highRisk}
                          </VuiTypography>
                        </VuiBox>
                        <VuiTypography variant="caption" color="text">
                          {totalUsers > 0 ? Math.round((highRisk / totalUsers) * 100) : 0}% of total users
                        </VuiTypography>
                      </VuiBox>

                      {/* Medium Risk */}
                      <VuiBox
                        p={2}
                        sx={{
                          backgroundColor: "rgba(245, 158, 11, 0.15)",
                          borderRadius: "12px",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                        }}
                      >
                        <VuiBox display="flex" justifyContent="space-between" alignItems="center">
                          <VuiTypography variant="button" color="white" fontWeight="medium">
                            Medium Risk
                          </VuiTypography>
                          <VuiTypography variant="h4" color="warning" fontWeight="bold">
                            {mediumRisk}
                          </VuiTypography>
                        </VuiBox>
                        <VuiTypography variant="caption" color="text">
                          {totalUsers > 0 ? Math.round((mediumRisk / totalUsers) * 100) : 0}% of total users
                        </VuiTypography>
                      </VuiBox>

                      {/* Low Risk */}
                      <VuiBox
                        p={2}
                        sx={{
                          backgroundColor: "rgba(16, 185, 129, 0.15)",
                          borderRadius: "12px",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        <VuiBox display="flex" justifyContent="space-between" alignItems="center">
                          <VuiTypography variant="button" color="white" fontWeight="medium">
                            Low Risk
                          </VuiTypography>
                          <VuiTypography variant="h4" color="success" fontWeight="bold">
                            {lowRisk}
                          </VuiTypography>
                        </VuiBox>
                        <VuiTypography variant="caption" color="text">
                          {totalUsers > 0 ? Math.round((lowRisk / totalUsers) * 100) : 0}% of total users
                        </VuiTypography>
                      </VuiBox>
                    </VuiBox>
                  )}
                </VuiBox>
              </Card>
            </Grid>
          </Grid>
        </VuiBox>

        {/* Charts Row 2 */}
        <VuiBox mb={3}>
          <Card>
            <VuiBox p={3}>
              <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <VuiBox>
                  <VuiTypography variant="lg" color="white" fontWeight="bold">
                    Top 10 High-Risk Users
                  </VuiTypography>
                  <VuiTypography variant="caption" color="text">
                    Users ranked by anomaly risk score
                  </VuiTypography>
                </VuiBox>
                <VuiButton
                  color="info"
                  size="small"
                  onClick={() => history.push("/detect")}
                  sx={{ textTransform: "none" }}
                >
                  View All Detections <IoArrowForward style={{ marginLeft: 8 }} />
                </VuiButton>
              </VuiBox>
              {loadingRiskUsers ? (
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.08)" }} />
              ) : topRiskUsers.length > 0 ? (
                <VuiBox sx={{ height: 400 }}>
                  <BarChart barChartData={barChartData} barChartOptions={barChartOptions} />
                </VuiBox>
              ) : (
                <VuiBox textAlign="center" py={5}>
                  <VuiTypography variant="body2" color="text">
                    No risk data available. Run detection to generate risk scores.
                  </VuiTypography>
                </VuiBox>
              )}
            </VuiBox>
          </Card>
        </VuiBox>

        {/* Quick Actions */}
        <VuiBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ cursor: "pointer", transition: "all 0.3s", "&:hover": { transform: "translateY(-4px)" } }} onClick={() => history.push("/upload")}>
                <VuiBox p={3} textAlign="center">
                  <IoStatsChart size="48px" color="#0075FF" style={{ marginBottom: 16 }} />
                  <VuiTypography variant="h5" color="white" fontWeight="bold" mb={1}>
                    Upload New Logs
                  </VuiTypography>
                  <VuiTypography variant="caption" color="text">
                    Add more data for analysis
                  </VuiTypography>
                </VuiBox>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ cursor: "pointer", transition: "all 0.3s", "&:hover": { transform: "translateY(-4px)" } }} onClick={() => history.push("/train")}>
                <VuiBox p={3} textAlign="center">
                  <IoShield size="48px" color="#10b981" style={{ marginBottom: 16 }} />
                  <VuiTypography variant="h5" color="white" fontWeight="bold" mb={1}>
                    Train Models
                  </VuiTypography>
                  <VuiTypography variant="caption" color="text">
                    Improve detection accuracy
                  </VuiTypography>
                </VuiBox>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ cursor: "pointer", transition: "all 0.3s", "&:hover": { transform: "translateY(-4px)" } }} onClick={() => history.push("/detect")}>
                <VuiBox p={3} textAlign="center">
                  <IoWarning size="48px" color="#f59e0b" style={{ marginBottom: 16 }} />
                  <VuiTypography variant="h5" color="white" fontWeight="bold" mb={1}>
                    Run Detection
                  </VuiTypography>
                  <VuiTypography variant="caption" color="text">
                    Identify new threats
                  </VuiTypography>
                </VuiBox>
              </Card>
            </Grid>
          </Grid>
        </VuiBox>
      </VuiBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Analytics;
