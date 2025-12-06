import { useState, useEffect } from "react";

// react-router components
import { useLocation, Link, useHistory } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @material-ui core components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";

// Vision UI Dashboard React example components
import Breadcrumbs from "examples/Breadcrumbs";
import NotificationItem from "examples/Items/NotificationItem";

// Custom styles for DashboardNavbar
import {
  navbar,
  navbarContainer,
  navbarRow,
  navbarIconButton,
  navbarMobileMenu,
} from "examples/Navbars/DashboardNavbar/styles";

// Vision UI Dashboard React context
import {
  useVisionUIController,
  setTransparentNavbar,
  setMiniSidenav,
  setOpenConfigurator,
} from "context";

// Images
import team2 from "assets/images/team-2.jpg";
import logoSpotify from "assets/images/small-logos/logo-spotify.svg";

function DashboardNavbar({ absolute, light, isMini }) {
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useVisionUIController();
  const { miniSidenav, transparentNavbar, fixedNavbar, openConfigurator } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const route = useLocation().pathname.split("/").slice(1);
  const history = useHistory();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    let parsedUser = {};

    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      try {
        parsedUser = JSON.parse(rawUser);
      } catch (error) {
        console.warn("Failed to parse stored user. Clearing corrupt value.", error);
        localStorage.removeItem("user");
      }
    }

    setIsLoggedIn(!!token);
    setUsername(parsedUser?.username || "");
    setUserProfile(parsedUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    history.push("/authentication/sign-in");
  };

  useEffect(() => {
    // Setting the navbar type
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }

    // A function that sets the transparent state of the navbar.
    function handleTransparentNavbar() {
      setTransparentNavbar(dispatch, (fixedNavbar && window.scrollY === 0) || !fixedNavbar);
    }

    /** 
     The event listener that's calling the handleTransparentNavbar function when 
     scrolling the window.
    */
    window.addEventListener("scroll", handleTransparentNavbar);

    // Call the handleTransparentNavbar function to set the state with the initial value.
    handleTransparentNavbar();

    // Remove event listener on cleanup
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = (event) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);
  const handleOpenProfileMenu = (event) => setProfileMenuAnchor(event.currentTarget);
  const handleCloseProfileMenu = () => setProfileMenuAnchor(null);

  const handleProfileMenuAction = (action) => {
    handleCloseProfileMenu();
    if (action === 'profile') {
      history.push('/profile');
    } else if (action === 'settings') {
      setOpenConfigurator(dispatch, true);
    } else if (action === 'logout') {
      handleLogout();
    }
  };

  // Render the profile/notifications menu
  const renderMenu = () => (
    <Menu
      anchorEl={openMenu}
      anchorReference={null}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      open={Boolean(openMenu)}
      onClose={handleCloseMenu}
      sx={{ mt: 2 }}
    >
      {isLoggedIn ? (
        <>
          <NotificationItem
            color="text"
            image={
              <Icon fontSize="small" sx={{ color: ({ palette: { white } }) => white.main }}>
                person
              </Icon>
            }
            title={["", username || "User"]}
            date=""
            onClick={handleCloseMenu}
          />
          <Link to="/profile" style={{ textDecoration: 'none' }}>
            <NotificationItem
              color="text"
              image={
                <Icon fontSize="small" sx={{ color: ({ palette: { white } }) => white.main }}>
                  person
                </Icon>
              }
              title={["", "View Profile"]}
              date=""
              onClick={handleCloseMenu}
            />
          </Link>
          <NotificationItem
            color="text"
            image={
              <Icon fontSize="small" sx={{ color: ({ palette: { white } }) => white.main }}>
                logout
              </Icon>
            }
            title={["", "Logout"]}
            date=""
            onClick={() => {
              handleCloseMenu();
              handleLogout();
            }}
          />
        </>
      ) : (
        <>
          <NotificationItem
            image={<img src={team2} alt="person" />}
            title={["New message", "from Laur"]}
            date="13 minutes ago"
            onClick={handleCloseMenu}
          />
          <NotificationItem
            image={<img src={logoSpotify} alt="person" />}
            title={["New album", "by Travis Scott"]}
            date="1 day"
            onClick={handleCloseMenu}
          />
        </>
      )}
    </Menu>
  );

  // Render the profile menu
  const renderProfileMenu = () => {
    const displayName = userProfile?.username || "User";
    const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
    const avatarUrl = userProfile?.avatar_url 
      ? (userProfile.avatar_url.startsWith('http') ? userProfile.avatar_url : `${API_BASE}${userProfile.avatar_url}`)
      : `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(displayName)}`;

    return (
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleCloseProfileMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            backgroundColor: 'rgba(20, 28, 58, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(226, 232, 240, 0.1)',
            minWidth: 200,
          }
        }}
      >
        <VuiBox px={2} py={1.5}>
          <VuiTypography variant="button" color="white" fontWeight="bold">
            {displayName}
          </VuiTypography>
          <VuiTypography variant="caption" color="text" display="block">
            {userProfile?.email || ''}
          </VuiTypography>
        </VuiBox>
        <Divider sx={{ borderColor: 'rgba(226, 232, 240, 0.1)', my: 0.5 }} />
        <MenuItem onClick={() => handleProfileMenuAction('profile')} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Icon sx={{ color: '#0075FF' }}>person</Icon>
          </ListItemIcon>
          <VuiTypography variant="button" color="white">
            My Profile
          </VuiTypography>
        </MenuItem>
        <MenuItem onClick={() => handleProfileMenuAction('settings')} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Icon sx={{ color: '#0075FF' }}>settings</Icon>
          </ListItemIcon>
          <VuiTypography variant="button" color="white">
            Settings
          </VuiTypography>
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(226, 232, 240, 0.1)', my: 0.5 }} />
        <MenuItem onClick={() => handleProfileMenuAction('logout')} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Icon sx={{ color: '#f87171' }}>logout</Icon>
          </ListItemIcon>
          <VuiTypography variant="button" color="error">
            Logout
          </VuiTypography>
        </MenuItem>
      </Menu>
    );
  };

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      sx={(theme) => navbar(theme, { transparentNavbar, absolute, light })}
    >
      <Toolbar sx={(theme) => navbarContainer(theme)}>
        <VuiBox color="inherit" mb={{ xs: 1, md: 0 }} sx={(theme) => navbarRow(theme, { isMini })}>
          <Breadcrumbs icon="home" title={route[route.length - 1]} route={route} light={light} />
        </VuiBox>
        {isMini ? null : (
          <VuiBox sx={(theme) => navbarRow(theme, { isMini })}>
            <VuiBox pr={1}>
              <VuiInput
                placeholder="Type here..."
                icon={{ component: "search", direction: "left" }}
                sx={({ breakpoints }) => ({
                  [breakpoints.down("sm")]: {
                    maxWidth: "80px",
                  },
                  [breakpoints.only("sm")]: {
                    maxWidth: "80px",
                  },
                  backgroundColor: "info.main !important",
                })}
              />
            </VuiBox>
            <VuiBox color={light ? "white" : "inherit"}>
              {isLoggedIn ? (
                <>
                  <IconButton
                    sx={{
                      ...navbarIconButton,
                      p: 0.5,
                      ml: 1,
                    }}
                    size="small"
                    onClick={handleOpenProfileMenu}
                  >
                    <Avatar
                      src={
                        userProfile?.avatar_url
                          ? (userProfile.avatar_url.startsWith('http') 
                              ? userProfile.avatar_url 
                              : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000'}${userProfile.avatar_url}`)
                          : `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(userProfile?.username || 'User')}`
                      }
                      alt={userProfile?.username || 'User'}
                      sx={{
                        width: 32,
                        height: 32,
                        border: '2px solid rgba(0, 117, 255, 0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          borderColor: 'rgba(0, 117, 255, 1)',
                        }
                      }}
                    />
                  </IconButton>
                  {renderProfileMenu()}
                </>
              ) : (
                <Link to="/authentication/sign-in">
                  <IconButton sx={navbarIconButton} size="small">
                    <Icon
                      sx={({ palette: { dark, white } }) => ({
                        color: light ? white.main : dark.main,
                      })}
                    >
                      account_circle
                    </Icon>
                    <VuiTypography
                      variant="button"
                      fontWeight="medium"
                      color={light ? "white" : "dark"}
                    >
                      Sign in
                    </VuiTypography>
                  </IconButton>
                </Link>
              )}
              <IconButton
                size="small"
                color="inherit"
                sx={navbarMobileMenu}
                onClick={handleMiniSidenav}
              >
                <Icon className={"text-white"}>{miniSidenav ? "menu_open" : "menu"}</Icon>
              </IconButton>
              <IconButton
                size="small"
                color="inherit"
                sx={navbarIconButton}
                onClick={handleConfiguratorOpen}
              >
                <Icon>settings</Icon>
              </IconButton>
            </VuiBox>
          </VuiBox>
        )}
      </Toolbar>
    </AppBar>
  );
}

// Setting default values for the props of DashboardNavbar
DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false,
};

// Typechecking props for the DashboardNavbar
DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
};

export default DashboardNavbar;
