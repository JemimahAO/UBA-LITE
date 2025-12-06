import PropTypes from "prop-types";
import { Card, Grid, LinearProgress, Skeleton } from "@mui/material";

import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";

const formatNumber = (value) => {
  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return value ?? "0";
};

const Metric = ({ label, value, helper, progress }) => (
  <VuiBox display="flex" flexDirection="column" gap={0.5}>
    <VuiTypography variant="caption" color="text" textTransform="uppercase">
      {label}
    </VuiTypography>
    <VuiTypography variant="h5" color="white" fontWeight="bold">
      {value}
    </VuiTypography>
    {helper ? (
      <VuiTypography variant="caption" color="text">
        {helper}
      </VuiTypography>
    ) : null}
    {typeof progress === "number" ? (
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(progress, 100))}
        sx={{
          height: 8,
          borderRadius: "8px",
          backgroundColor: "rgba(255,255,255,0.12)",
          "& .MuiLinearProgress-bar": {
            borderRadius: "8px",
            background: "linear-gradient(90deg, #0075FF 0%, #2CD9FF 100%)",
          },
        }}
      />
    ) : null}
  </VuiBox>
);

Metric.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  helper: PropTypes.string,
  progress: PropTypes.number,
};

Metric.defaultProps = {
  helper: undefined,
  progress: undefined,
};

const AnomalyBreakdownCard = ({ stats, loading }) => {
  const totalLogs = stats?.total_logs ?? 0;
  const totalDetections = stats?.total_detections ?? 0;
  const anomaliesDetected = stats?.anomalies_detected ?? 0;
  const highRiskAccounts = stats?.high_risk_users ?? 0;
  const modelsTrained = stats?.models_trained ?? 0;

  const detectionCoverage = totalLogs ? Math.round((totalDetections / totalLogs) * 100) : 0;
  const anomalyRate = totalLogs ? Math.round((anomaliesDetected / totalLogs) * 100) : 0;

  const metrics = [
    {
      label: "Events ingested",
      value: formatNumber(totalLogs),
      helper: "Total log entries available for analytics",
    },
    {
      label: "Alerts generated",
      value: formatNumber(totalDetections),
      helper: `${detectionCoverage}% detection coverage`,
      progress: detectionCoverage,
    },
    {
      label: "Anomalies escalated",
      value: formatNumber(anomaliesDetected),
      helper: `${anomalyRate}% of monitored activity`,
      progress: anomalyRate,
    },
    {
      label: "High-risk accounts",
      value: formatNumber(highRiskAccounts),
      helper: `${formatNumber(modelsTrained)} models currently deployed`,
    },
  ];

  return (
    <Card sx={{ height: "100%" }}>
      <VuiBox p={3} display="flex" flexDirection="column" height="100%">
        <VuiTypography variant="lg" color="white" fontWeight="bold" mb="6px">
          Detection throughput
        </VuiTypography>
        <VuiTypography variant="caption" color="text" mb={3}>
          Snapshot of ingestion, alerting, and escalation coverage
        </VuiTypography>
        <Grid container spacing={2} flexGrow={1}>
          {metrics.map((metric) => (
            <Grid item xs={12} key={metric.label}>
              {loading ? (
                <Skeleton
                  variant="rectangular"
                  height={82}
                  sx={{ borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.08)" }}
                />
              ) : (
                <Metric {...metric} />
              )}
            </Grid>
          ))}
        </Grid>
      </VuiBox>
    </Card>
  );
};

AnomalyBreakdownCard.propTypes = {
  stats: PropTypes.shape({
    total_logs: PropTypes.number,
    total_detections: PropTypes.number,
    anomalies_detected: PropTypes.number,
    high_risk_users: PropTypes.number,
    models_trained: PropTypes.number,
  }),
  loading: PropTypes.bool,
};

AnomalyBreakdownCard.defaultProps = {
  stats: undefined,
  loading: false,
};

export default AnomalyBreakdownCard;
