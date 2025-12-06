import AppBar from "@mui/material/AppBar";
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";

// Vision UI Dashboard React example components
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Icons
import { IoRefresh, IoCamera } from "react-icons/io5";

function Header({ user, profile, loading, onRefresh, onAvatarClick, uploadingAvatar }) {
  const displayName = profile?.full_name?.trim() || user?.username || "Analyst";
  const email = user?.email || "";
  const jobTitle = profile?.job_title || "Security Analyst";
  const roleLabel = user?.is_admin ? "Administrator" : "Analyst";
  
  const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
  const avatarSrc = profile?.avatar_url 
    ? (profile.avatar_url.startsWith('http') ? profile.avatar_url : `${API_BASE}${profile.avatar_url}`)
    : `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(displayName)}`;

  return (
    <VuiBox position="relative">
      <DashboardNavbar light />
      <Card sx={{ px: 3, mt: 2, py: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={2} display="flex" justifyContent="center">
            {loading ? (
              <Skeleton variant="circular" width={96} height={96} />
            ) : (
              <VuiBox position="relative" display="inline-block">
                <Avatar
                  src={avatarSrc}
                  alt={displayName}
                  sx={{ 
                    width: 96, 
                    height: 96, 
                    borderRadius: "20px",
                    cursor: onAvatarClick ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    '&:hover': onAvatarClick ? {
                      opacity: 0.8,
                      transform: 'scale(1.02)'
                    } : {}
                  }}
                  onClick={onAvatarClick}
                />
                {uploadingAvatar && (
                  <VuiBox
                    position="absolute"
                    top={0}
                    left={0}
                    width="100%"
                    height="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderRadius: "20px"
                    }}
                  >
                    <CircularProgress size={32} thickness={4} sx={{ color: '#0075FF' }} />
                  </VuiBox>
                )}
                {onAvatarClick && !uploadingAvatar && (
                  <Tooltip title="Change avatar">
                    <VuiBox
                      position="absolute"
                      bottom={0}
                      right={0}
                      sx={{
                        backgroundColor: '#0075FF',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: '#0056CC'
                        }
                      }}
                      onClick={onAvatarClick}
                    >
                      <IoCamera size="16px" color="white" />
                    </VuiBox>
                  </Tooltip>
                )}
              </VuiBox>
            )}
          </Grid>
          <Grid item xs={12} md={7}>
            <VuiBox display="flex" flexDirection="column" gap={0.5}>
              {loading ? (
                <>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="40%" height={24} />
                  <Skeleton variant="text" width="50%" height={20} />
                </>
              ) : (
                <>
                  <VuiTypography variant="lg" color="white" fontWeight="bold">
                    {displayName}
                  </VuiTypography>
                  <VuiTypography variant="button" color="text">
                    {jobTitle}
                  </VuiTypography>
                  <VuiTypography variant="caption" color="text">
                    {email || "No email on file"}
                  </VuiTypography>
                  <Chip
                    label={roleLabel}
                    size="small"
                    color={user?.is_admin ? "secondary" : "primary"}
                    variant="outlined"
                    sx={{ alignSelf: "flex-start", mt: 1 }}
                  />
                </>
              )}
            </VuiBox>
          </Grid>
          <Grid
            item
            xs={12}
            md={3}
            display="flex"
            justifyContent={{ xs: "flex-start", md: "flex-end" }}
          >
            {onRefresh && (
              <Tooltip title="Refresh profile">
                <span>
                  <IconButton
                    onClick={onRefresh}
                    disabled={loading}
                    sx={{
                      backgroundColor: "rgba(1, 181, 116, 0.12)",
                      color: "#01B574",
                      "&:hover": { backgroundColor: "rgba(1, 181, 116, 0.24)" },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} thickness={5} color="inherit" />
                    ) : (
                      <IoRefresh size="18px" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Grid>
        </Grid>
      </Card>
    </VuiBox>
  );
}

Header.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    email: PropTypes.string,
    is_admin: PropTypes.bool,
  }),
  profile: PropTypes.shape({
    full_name: PropTypes.string,
    job_title: PropTypes.string,
    avatar_url: PropTypes.string,
  }),
  loading: PropTypes.bool,
  onRefresh: PropTypes.func,
  onAvatarClick: PropTypes.func,
  uploadingAvatar: PropTypes.bool,
};

export default Header;
