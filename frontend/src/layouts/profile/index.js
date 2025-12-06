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

import { useEffect, useMemo, useState, useRef } from "react";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import Footer from "examples/Footer";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";

// Overview page components
import Header from "layouts/profile/components/Header";
import PlatformSettings from "layouts/profile/components/PlatformSettings";

// Services
import { authAPI } from "services/api";

const emptyProfile = {
  full_name: "",
  job_title: "",
  department: "",
  location: "",
  phone: "",
  bio: "",
  avatar_url: "",
  email: "",
};

const emptyPasswordForm = {
  current_password: "",
  new_password: "",
  confirm_new_password: "",
};

function Overview() {
  const [profileResponse, setProfileResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const fileInputRef = useRef(null);

  const user = profileResponse?.user;
  const profile = profileResponse?.profile;
  const preferences = profile?.notification_preferences;

  const bioCharacterLimit = 280;
  const bioCharactersRemaining = bioCharacterLimit - (profileForm.bio?.length || 0);

  const textFieldSx = {
    mb: 0,
    "& .MuiInputLabel-root": {
      color: "#7480a8",
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#ffffff",
    },
    "& .MuiOutlinedInput-root": {
      backgroundColor: "rgba(6, 11, 40, 0.6)",
      borderRadius: "12px",
      color: "#fff",
      "& fieldset": {
        borderColor: "rgba(226, 232, 240, 0.25)",
      },
      "&:hover fieldset": {
        borderColor: "rgba(0, 117, 255, 0.6)",
      },
      "&.Mui-focused fieldset": {
        borderColor: "rgba(0, 117, 255, 0.85)",
      },
    },
    "& .MuiInputBase-input": {
      fontSize: "0.95rem",
    },
    "& .MuiFormHelperText-root": {
      color: "#7480a8",
      marginLeft: 0,
    },
  };

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const showMessage = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getProfile();
      const data = response.data;
      setProfileResponse(data);
      setProfileForm({
        full_name: data.profile.full_name || "",
        job_title: data.profile.job_title || "",
        department: data.profile.department || "",
        location: data.profile.location || "",
        phone: data.profile.phone || "",
        bio: data.profile.bio || "",
        avatar_url: data.profile.avatar_url || "",
        email: data.user.email || "",
      });
      // Sync basic user info + avatar to localStorage so navbar avatar uses it
      const storedUser = {
        ...data.user,
        avatar_url: data.profile.avatar_url || null,
      };
      localStorage.setItem("user", JSON.stringify(storedUser));
    } catch (error) {
      console.error("Failed to load profile", error);
      showMessage(error.response?.data?.detail || "Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileFieldChange = (field) => (event) => {
    const value = event.target.value;
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = {
        full_name: profileForm.full_name || null,
        job_title: profileForm.job_title || null,
        department: profileForm.department || null,
        location: profileForm.location || null,
        phone: profileForm.phone || null,
        bio: profileForm.bio || null,
        avatar_url: profileForm.avatar_url || null,
        email: profileForm.email || null,
      };

      const response = await authAPI.updateProfile(payload);
      setProfileResponse(response.data);
      // Also update localStorage user so navbar sees latest email + avatar
      const updatedUser = {
        ...response.data.user,
        avatar_url: response.data.profile?.avatar_url || profileForm.avatar_url || null,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      showMessage("Profile details updated successfully");
    } catch (error) {
      console.error("Failed to update profile", error);
      showMessage(error.response?.data?.detail || "Unable to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePreferenceToggle = async (key, value) => {
    setSavingPreferences(true);
    try {
      const response = await authAPI.updatePreferences({ [key]: value });
      setProfileResponse(response.data);
      showMessage("Notification preferences saved");
    } catch (error) {
      console.error("Failed to update preferences", error);
      showMessage(error.response?.data?.detail || "Unable to update preferences", "error");
    } finally {
      setSavingPreferences(false);
    }
  };

  const handlePasswordFieldChange = (field) => (event) => {
    const value = event.target.value;
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_new_password) {
      showMessage("Please fill out all password fields", "error");
      return;
    }

    setSavingPassword(true);
    try {
      await authAPI.changePassword(passwordForm);
      setPasswordForm(emptyPasswordForm);
      showMessage("Password updated successfully");
    } catch (error) {
      console.error("Failed to change password", error);
      showMessage(error.response?.data?.detail || "Unable to change password", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('Please select a valid image file (JPG, PNG, GIF, or WebP)', 'error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Image size must be less than 5MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const response = await authAPI.uploadAvatar(file);
      const avatarUrl = response.data.avatar_url;
      
      // Update profile response with new avatar
      setProfileResponse(prev => ({
        ...prev,
        profile: { ...prev.profile, avatar_url: avatarUrl }
      }));
      
      // Sync avatar to localStorage user so navbar avatar updates
      try {
        const rawUser = localStorage.getItem("user");
        const parsedUser = rawUser ? JSON.parse(rawUser) : {};
        const storedUser = { ...parsedUser, avatar_url: avatarUrl };
        localStorage.setItem("user", JSON.stringify(storedUser));
      } catch (e) {
        console.warn("Failed to sync avatar to localStorage user", e);
      }
      
      showMessage('Avatar updated successfully');
    } catch (error) {
      console.error('Failed to upload avatar', error);
      showMessage(error.response?.data?.detail || 'Unable to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const lastUpdatedDisplay = useMemo(() => {
    if (!profile?.updated_at) return "Never";
    try {
      return new Date(profile.updated_at).toLocaleString();
    } catch (error) {
      return profile.updated_at;
    }
  }, [profile?.updated_at]);

  return (
    <DashboardLayout>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <Header 
        user={user} 
        profile={profile} 
        loading={loading} 
        onRefresh={loadProfile}
        onAvatarClick={handleAvatarClick}
        uploadingAvatar={uploadingAvatar}
      />

      <VuiBox mt={5} mb={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8} display="flex" flexDirection="column" gap={3}>
            <Card sx={{ p: 3 }}>
              <VuiBox mb={3} display="flex" justifyContent="space-between" alignItems="center">
                <div>
                  <VuiTypography variant="h5" color="white" fontWeight="bold">
                    Profile details
                  </VuiTypography>
                  <VuiTypography variant="caption" color="text">
                    Manage your identity and contact information across the platform.
                  </VuiTypography>
                </div>
                {savingProfile && <CircularProgress size={20} thickness={4} color="info" />}
              </VuiBox>

              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <VuiBox display="flex" flexDirection="column" gap={1}>
                      <VuiTypography variant="caption" color="text" fontWeight="medium">
                        Full name
                      </VuiTypography>
                      <TextField
                        fullWidth
                        placeholder="Enter full name"
                        value={profileForm.full_name}
                        onChange={handleProfileFieldChange("full_name")}
                        variant="outlined"
                        sx={textFieldSx}
                      />
                    </VuiBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <VuiBox display="flex" flexDirection="column" gap={1}>
                      <VuiTypography variant="caption" color="text" fontWeight="medium">
                        Job title
                      </VuiTypography>
                      <TextField
                        fullWidth
                        placeholder="e.g. Security Analyst"
                        value={profileForm.job_title}
                        onChange={handleProfileFieldChange("job_title")}
                        variant="outlined"
                        sx={textFieldSx}
                      />
                    </VuiBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <VuiBox display="flex" flexDirection="column" gap={1}>
                      <VuiTypography variant="caption" color="text" fontWeight="medium">
                        Department
                      </VuiTypography>
                      <TextField
                        fullWidth
                        placeholder="e.g. Threat Intelligence"
                        value={profileForm.department}
                        onChange={handleProfileFieldChange("department")}
                        variant="outlined"
                        sx={textFieldSx}
                      />
                    </VuiBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <VuiBox display="flex" flexDirection="column" gap={1}>
                      <VuiTypography variant="caption" color="text" fontWeight="medium">
                        Location
                      </VuiTypography>
                      <TextField
                        fullWidth
                        placeholder="City, Country"
                        value={profileForm.location}
                        onChange={handleProfileFieldChange("location")}
                        variant="outlined"
                        sx={textFieldSx}
                      />
                    </VuiBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <VuiBox display="flex" flexDirection="column" gap={1}>
                      <VuiTypography variant="caption" color="text" fontWeight="medium">
                        Work email
                      </VuiTypography>
                      <TextField
                        fullWidth
                        placeholder="name@company.com"
                        value={profileForm.email}
                        onChange={handleProfileFieldChange("email")}
                        variant="outlined"
                        type="email"
                        sx={textFieldSx}
                      />
                    </VuiBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <VuiBox display="flex" flexDirection="column" gap={1}>
                      <VuiTypography variant="caption" color="text" fontWeight="medium">
                        Phone number
                      </VuiTypography>
                      <TextField
                        fullWidth
                        placeholder="Optional"
                        value={profileForm.phone}
                        onChange={handleProfileFieldChange("phone")}
                        variant="outlined"
                        sx={textFieldSx}
                      />
                    </VuiBox>
                  </Grid>
                </Grid>

                <VuiBox display="flex" flexDirection="column" gap={1}>
                  <VuiTypography variant="caption" color="text" fontWeight="medium">
                    Bio
                  </VuiTypography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="Short introduction for your teammates"
                    value={profileForm.bio}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value.length <= bioCharacterLimit) {
                        handleProfileFieldChange("bio")({ target: { value } });
                      }
                    }}
                    variant="outlined"
                    helperText={`${bioCharactersRemaining} characters remaining`}
                    sx={textFieldSx}
                  />
                </VuiBox>

                <VuiBox display="flex" flexDirection="column" gap={1}>
                  <VuiTypography variant="caption" color="text" fontWeight="medium">
                    Avatar URL
                  </VuiTypography>
                  <TextField
                    fullWidth
                    placeholder="https://example.com/avatar.png"
                    value={profileForm.avatar_url}
                    onChange={handleProfileFieldChange("avatar_url")}
                    variant="outlined"
                    sx={textFieldSx}
                  />
                </VuiBox>

                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    disabled={savingProfile || loading}
                    onClick={() => {
                      setProfileForm({
                        full_name: profile?.full_name || "",
                        job_title: profile?.job_title || "",
                        department: profile?.department || "",
                        location: profile?.location || "",
                        phone: profile?.phone || "",
                        bio: profile?.bio || "",
                        avatar_url: profile?.avatar_url || "",
                        email: user?.email || "",
                      });
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="contained"
                    color="info"
                    onClick={handleSaveProfile}
                    disabled={savingProfile || loading}
                  >
                    Save changes
                  </Button>
                </Stack>
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <VuiBox mb={3}>
                <VuiTypography variant="h5" color="white" fontWeight="bold">
                  Security
                </VuiTypography>
                <VuiTypography variant="caption" color="text">
                  Update your password regularly to keep your account protected.
                </VuiTypography>
              </VuiBox>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <VuiBox display="flex" flexDirection="column" gap={1}>
                    <VuiTypography variant="caption" color="text" fontWeight="medium">
                      Current password
                    </VuiTypography>
                    <TextField
                      fullWidth
                      placeholder="Enter current password"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={handlePasswordFieldChange("current_password")}
                      variant="outlined"
                      sx={textFieldSx}
                    />
                  </VuiBox>
                </Grid>
                <Grid item xs={12} md={4}>
                  <VuiBox display="flex" flexDirection="column" gap={1}>
                    <VuiTypography variant="caption" color="text" fontWeight="medium">
                      New password
                    </VuiTypography>
                    <TextField
                      fullWidth
                      placeholder="Enter new password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={handlePasswordFieldChange("new_password")}
                      variant="outlined"
                      sx={textFieldSx}
                    />
                  </VuiBox>
                </Grid>
                <Grid item xs={12} md={4}>
                  <VuiBox display="flex" flexDirection="column" gap={1}>
                    <VuiTypography variant="caption" color="text" fontWeight="medium">
                      Confirm new password
                    </VuiTypography>
                    <TextField
                      fullWidth
                      placeholder="Re-enter new password"
                      type="password"
                      value={passwordForm.confirm_new_password}
                      onChange={handlePasswordFieldChange("confirm_new_password")}
                      variant="outlined"
                      sx={textFieldSx}
                    />
                  </VuiBox>
                </Grid>
              </Grid>

              <Stack direction="row" justifyContent="flex-end" spacing={2} mt={3}>
                <Button
                  variant="outlined"
                  color="inherit"
                  disabled={savingPassword}
                  onClick={() => setPasswordForm(emptyPasswordForm)}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  color="info"
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </Button>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4} display="flex" flexDirection="column" gap={3}>
            <PlatformSettings
              preferences={preferences}
              saving={savingPreferences}
              disabled={loading}
              onToggle={handlePreferenceToggle}
            />

            <Card sx={{ p: 3, maxHeight: '400px', overflowY: 'auto' }}>
              <VuiTypography variant="h6" color="white" fontWeight="bold" mb={2}>
                Account activity
              </VuiTypography>
              <Divider sx={{ my: 2, borderColor: "rgba(226, 232, 240, 0.12)" }} />
              <Stack spacing={2.5}>
                <VuiBox>
                  <VuiTypography variant="caption" color="text" fontWeight="bold" display="block" mb={0.5}>
                    Role
                  </VuiTypography>
                  <VuiTypography variant="button" color="white">
                    {user?.is_admin ? "Administrator" : "Analyst"}
                  </VuiTypography>
                </VuiBox>
                <VuiBox>
                  <VuiTypography variant="caption" color="text" fontWeight="bold" display="block" mb={0.5}>
                    Member since
                  </VuiTypography>
                  <VuiTypography variant="button" color="white">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </VuiTypography>
                </VuiBox>
                <VuiBox>
                  <VuiTypography variant="caption" color="text" fontWeight="bold" display="block" mb={0.5}>
                    Last profile update
                  </VuiTypography>
                  <VuiTypography variant="button" color="white">
                    {lastUpdatedDisplay}
                  </VuiTypography>
                </VuiBox>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </VuiBox>

      <Footer />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default Overview;
