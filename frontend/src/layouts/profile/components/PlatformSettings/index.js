/*!

=========================================================
* Vision UI Free React - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/vision-ui-free-react
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)
* Licensed under MIT (https://github.com/creativetimofficial/vision-ui-free-react/blob/master LICENSE.md)

* Design and Coded by Simmmple & Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiSwitch from "components/VuiSwitch";

const DEFAULTS = {
  high_risk_alerts: true,
  training_updates: true,
  system_updates: false,
};

function PlatformSettings({
  preferences = DEFAULTS,
  onToggle,
  saving = false,
  disabled = false,
}) {
  const merged = { ...DEFAULTS, ...preferences };
  const isDisabled = saving || disabled;

  const handleToggle = (key) => () => {
    if (isDisabled || !onToggle) return;
    onToggle(key, !merged[key]);
  };

  return (
    <Card sx={{ p: 3, maxHeight: "400px", overflowY: "auto" }}>
      <VuiBox mb={2} display="flex" alignItems="center" justifyContent="space-between">
        <VuiTypography variant="h6" fontWeight="bold" color="white">
          Notification preferences
        </VuiTypography>
        {saving && <CircularProgress size={18} thickness={6} color="info" />}
      </VuiBox>
      <VuiBox lineHeight={1.25}>
        <VuiTypography
          variant="xxs"
          fontWeight="medium"
          mb="16px"
          color="text"
          textTransform="uppercase"
        >
          alerts
        </VuiTypography>

        <VuiBox display="flex" mb="14px">
          <VuiBox mt={0.25}>
            <VuiSwitch
              color="info"
              checked={merged.high_risk_alerts}
              onChange={handleToggle("high_risk_alerts")}
              disabled={isDisabled}
            />
          </VuiBox>
          <VuiBox ml={2}>
            <VuiTypography variant="button" fontWeight="medium" color="white" display="block" mb={0.5}>
              High risk detections
            </VuiTypography>
            <VuiTypography variant="caption" color="text" display="block">
              Notify me immediately when a high-risk anomaly is detected.
            </VuiTypography>
          </VuiBox>
        </VuiBox>

        <VuiBox display="flex" mb="14px">
          <VuiBox mt={0.25}>
            <VuiSwitch
              color="info"
              checked={merged.training_updates}
              onChange={handleToggle("training_updates")}
              disabled={isDisabled}
            />
          </VuiBox>
          <VuiBox ml={2}>
            <VuiTypography variant="button" fontWeight="medium" color="white" display="block" mb={0.5}>
              Model training updates
            </VuiTypography>
            <VuiTypography variant="caption" color="text" display="block">
              Alert me when a training job completes or fails.
            </VuiTypography>
          </VuiBox>
        </VuiBox>

        <VuiBox display="flex">
          <VuiBox mt={0.25}>
            <VuiSwitch
              color="info"
              checked={merged.system_updates}
              onChange={handleToggle("system_updates")}
              disabled={isDisabled}
            />
          </VuiBox>
          <VuiBox ml={2}>
            <VuiTypography variant="button" fontWeight="medium" color="white" display="block" mb={0.5}>
              Weekly system digest
            </VuiTypography>
            <VuiTypography variant="caption" color="text" display="block">
              Receive a weekly summary of detection trends and platform health.
            </VuiTypography>
          </VuiBox>
        </VuiBox>
      </VuiBox>
    </Card>
  );
}

PlatformSettings.propTypes = {
  preferences: PropTypes.shape({
    high_risk_alerts: PropTypes.bool,
    training_updates: PropTypes.bool,
    system_updates: PropTypes.bool,
  }),
  onToggle: PropTypes.func,
  saving: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default PlatformSettings;
