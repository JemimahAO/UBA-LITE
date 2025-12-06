import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";

import { Card, Grid, Icon, Skeleton } from "@mui/material";
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";

import gif from "assets/images/cardimgfree.png";

const defaultStats = {
  monitoredAccounts: 0,
  anomaliesPastWeek: 0,
  modelsTrained: 0,
};

const WelcomeMark = ({ stats = defaultStats, loading = false, onViewAlerts }) => {
  const [username, setUsername] = useState("Analyst");

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user?.username) {
          setUsername(user.username);
        }
      } catch (error) {
        console.warn("Failed to parse stored user for welcome card. Clearing corrupt value.", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  const metrics = useMemo(
    () => [
      {
        label: "Monitored accounts",
        value: stats.monitoredAccounts ?? 0,
      },
      {
        label: "Alerts this week",
        value: stats.anomaliesPastWeek ?? 0,
      },
      {
        label: "Models deployed",
        value: stats.modelsTrained ?? 0,
      },
    ],
    [stats]
  );

  return (
    <Card
      sx={() => ({
        height: "100%",
        minHeight: "340px",
        py: "32px",
        px: "28px",
        backgroundImage: `url(${gif})`,
        backgroundSize: "cover",
        backgroundPosition: "50%",
      })}
    >
      <VuiBox height="100%" display="flex" flexDirection="column" justifyContent="space-between">
        <VuiBox>
          <VuiTypography color="text" variant="button" fontWeight="regular" mb="12px">
            Welcome back,
          </VuiTypography>
          <VuiTypography color="white" variant="h3" fontWeight="bold" mb="12px">
            {username}
          </VuiTypography>
          <VuiTypography color="text" variant="button" fontWeight="regular" mb="16px">
            Your JIREH UBA-LITE overview is ready. Review monitored accounts, escalations, and deployed models at a glance.
          </VuiTypography>
          <Grid container spacing={1.5} mb={2} columns={12}>
            {metrics.map((metric, index) => (
              <Grid item xs={12} sm={index === 0 ? 4.5 : 3.75} key={metric.label}>
                <VuiBox
                  sx={({ palette: { info }, borders: { borderRadius } }) => ({
                    backgroundColor: "rgba(14, 29, 61, 0.65)",
                    borderRadius: borderRadius.lg,
                    padding: "12px 16px",
                  })}
                >
                  <VuiTypography variant="caption" color="text" fontWeight="regular" textTransform="uppercase" mb="6px">
                    {metric.label}
                  </VuiTypography>
                  {loading ? (
                    <Skeleton variant="text" width={70} sx={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                  ) : (
                    <VuiTypography variant="h4" color="white" fontWeight="bold">
                      {metric.value?.toLocaleString?.() ?? metric.value}
                    </VuiTypography>
                  )}
                </VuiBox>
              </Grid>
            ))}
          </Grid>
        </VuiBox>
        <VuiTypography
          component="button"
          type="button"
          variant="button"
          color="info"
          fontWeight="bold"
          onClick={onViewAlerts}
          sx={{
            mr: "5px",
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
            backgroundColor: "rgba(0, 117, 255, 0.15)",
            border: "1px solid rgba(0, 117, 255, 0.5)",
            borderRadius: "8px",
            padding: "8px 16px",
            transition: "all 0.3s ease",
            '&:hover': {
              backgroundColor: "rgba(0, 117, 255, 0.25)",
              borderColor: "rgba(0, 117, 255, 0.8)",
            },

            "& .material-icons-round": {
              fontSize: "1.125rem",
              transform: `translate(2px, -0.5px)`,
              transition: "transform 0.2s cubic-bezier(0.34,1.61,0.7,1.3)",
            },

            "&:hover .material-icons-round, &:focus .material-icons-round": {
              transform: `translate(6px, -0.5px)`,
            },
          }}
        >
          View active alerts
          <Icon sx={{ fontWeight: "bold", ml: "5px" }}>arrow_forward</Icon>
        </VuiTypography>
      </VuiBox>
    </Card>
  );
};

WelcomeMark.propTypes = {
  stats: PropTypes.shape({
    monitoredAccounts: PropTypes.number,
    anomaliesPastWeek: PropTypes.number,
    modelsTrained: PropTypes.number,
  }),
  loading: PropTypes.bool,
  onViewAlerts: PropTypes.func,
};

WelcomeMark.defaultProps = {
  stats: defaultStats,
  loading: false,
  onViewAlerts: () => {},
};

export default WelcomeMark;
