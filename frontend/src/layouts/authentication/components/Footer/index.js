import Grid from "@mui/material/Grid";

// @mui icons
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";
import PinterestIcon from "@mui/icons-material/Pinterest";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";

function Footer() {
  return (
    <VuiBox
      component="footer"
      py={6}
      sx={({ breakpoints }) => ({
        maxWidth: "450px",
        [breakpoints.down("xl")]: {
          maxWidth: "400px",
        },
      })}
    >
      <Grid container justifyContent="center">
        <Grid item xs={12} sx={{ textAlign: "center" }}>
          <VuiTypography
            variant="button"
            sx={{ textAlign: "center", fontWeight: "400 !important" }}
            color="text"
          >
            © {new Date().getFullYear()} Joel Ntujo — UBA-Lite
          </VuiTypography>
        </Grid>
        <Grid item xs={10}>
          <VuiBox display="flex" justifyContent="center" flexWrap="wrap" mb={3}>
            <VuiTypography variant="body2" color="text">
              UBA-Lite Insider Threat Detection Platform
            </VuiTypography>
          </VuiBox>
        </Grid>
      </Grid>
    </VuiBox>
  );
}

export default Footer;
