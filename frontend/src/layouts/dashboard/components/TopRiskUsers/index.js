import PropTypes from "prop-types";
import { Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton } from "@mui/material";

import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";

const SKELETON_ROWS = 5;

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
};

const TopRiskUsers = ({ users, loading }) => {
  const displayRows = loading ? Array.from({ length: SKELETON_ROWS }) : users.slice(0, 8);
  const hasData = !loading && users.length > 0;

  return (
    <Card sx={{ height: "100%" }}>
      <VuiBox p={3} pb={0} display="flex" flexDirection="column">
        <VuiTypography variant="lg" color="white" fontWeight="bold" mb="3px">
          Top high-risk users
        </VuiTypography>
        <VuiTypography variant="caption" color="text">
          Ranked by anomaly density and severity
        </VuiTypography>
      </VuiBox>
      <TableContainer sx={{ maxHeight: 360 }}>
        <Table stickyHeader size="small" aria-label="high risk users table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "#c8cfca", fontSize: "0.75rem" }}>User</TableCell>
              <TableCell sx={{ color: "#c8cfca", fontSize: "0.75rem" }} align="right">
                Events
              </TableCell>
              <TableCell sx={{ color: "#c8cfca", fontSize: "0.75rem" }} align="right">
                Anomalies
              </TableCell>
              <TableCell sx={{ color: "#c8cfca", fontSize: "0.75rem" }} align="right">
                High-risk
              </TableCell>
              <TableCell sx={{ color: "#c8cfca", fontSize: "0.75rem" }} align="right">
                Risk score
              </TableCell>
              <TableCell sx={{ color: "#c8cfca", fontSize: "0.75rem" }} align="right">
                Last seen
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRows.map((row, index) => {
              if (loading) {
                return (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={6}>
                      <Skeleton variant="text" height={24} sx={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
                    </TableCell>
                  </TableRow>
                );
              }

              return (
                <TableRow key={row.user_id ?? `user-${index}`} hover>
                  <TableCell sx={{ color: "white", fontSize: "0.85rem" }}>{row.user_id || "unknown"}</TableCell>
                  <TableCell sx={{ color: "#c8cfca", fontSize: "0.8rem" }} align="right">
                    {row.total_events?.toLocaleString?.() ?? row.total_events ?? "—"}
                  </TableCell>
                  <TableCell sx={{ color: "#c8cfca", fontSize: "0.8rem" }} align="right">
                    {row.anomalies?.toLocaleString?.() ?? row.anomalies ?? "—"}
                  </TableCell>
                  <TableCell sx={{ color: "#c8cfca", fontSize: "0.8rem" }} align="right">
                    {row.high_risk_events?.toLocaleString?.() ?? row.high_risk_events ?? "—"}
                  </TableCell>
                  <TableCell sx={{ color: "#c8cfca", fontSize: "0.8rem" }} align="right">
                    {typeof row.risk_score === "number" ? `${Math.round(row.risk_score * 100)}%` : "—"}
                  </TableCell>
                  <TableCell sx={{ color: "#c8cfca", fontSize: "0.8rem" }} align="right">
                    {formatDate(row.last_seen)}
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && !hasData ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ color: "#c8cfca", textAlign: "center", py: 3 }}>
                  No high-risk users yet. Ingest data or run detections to populate this view.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

TopRiskUsers.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      user_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      total_events: PropTypes.number,
      anomalies: PropTypes.number,
      high_risk_events: PropTypes.number,
      risk_score: PropTypes.number,
      last_seen: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    })
  ),
  loading: PropTypes.bool,
};

TopRiskUsers.defaultProps = {
  users: [],
  loading: false,
};

export default TopRiskUsers;
