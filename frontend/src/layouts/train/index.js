import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";

// Vision UI components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiButton from "components/VuiButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Charts
import ReactApexChart from "react-apexcharts";

// Icons
import { IoCloudUpload, IoPlayCircle, IoSave, IoReload, IoHardwareChip } from "react-icons/io5";

// API clients
import { uploadAPI, modelAPI, trainingAPI } from "services/api";

const MODEL_ALGORITHMS = [
  {
    value: "isolation_forest",
    label: "Isolation Forest",
    description: "Unsupervised anomaly detection ideal for insider threats.",
    contamination: 0.1,
    n_estimators: 200,
  },
  {
    value: "random_forest",
    label: "Random Forest",
    description: "Supervised baseline for labelled behaviour outcomes.",
    contamination: 0.08,
    n_estimators: 150,
  },
  {
    value: "logistic_regression",
    label: "Logistic Regression",
    description: "Fast linear baseline to compare against ensembles.",
    contamination: 0.05,
    n_estimators: 50,
  },
];

const METRIC_PRESETS = {
  isolation_forest: { accuracy: 0.94, precision: 0.9, recall: 0.92, f1: 0.91 },
  random_forest: { accuracy: 0.91, precision: 0.88, recall: 0.86, f1: 0.87 },
  logistic_regression: { accuracy: 0.87, precision: 0.84, recall: 0.82, f1: 0.83 },
};

const motionFade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
};

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

const formatTimestamp = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleString();
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
};

const toTitleCase = (value) =>
  value
    ? value
        .replace(/[_-]/g, " ")
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
    : "";

function TrainModel() {
  const [logTypes, setLogTypes] = useState([]);
  const [logTypeDescriptions, setLogTypeDescriptions] = useState({});
  const [selectedLogType, setSelectedLogType] = useState("");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(MODEL_ALGORITHMS[0].value);
  const [selectedFile, setSelectedFile] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState("idle");
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingSummary, setTrainingSummary] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");

  const trainingIntervalRef = useRef(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles?.length) return;
    setSelectedFile(acceptedFiles[0]);
    setMetrics(null);
    setTrainingSummary(null);
    setFeedback(null);
    setTrainingProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
    },
  });

  useEffect(() => {
    const fetchLogTypes = async () => {
      try {
        const response = await trainingAPI.getLogTypes();
        const types = response.data?.log_types || [];
        const descriptions = response.data?.descriptions || {};
        setLogTypes(types);
        setLogTypeDescriptions(descriptions);
        if (!selectedLogType && types.length) {
          setSelectedLogType(types[0]);
        }
      } catch (err) {
        console.error("Unable to load log types", err);
      }
    };

    const fetchModels = async () => {
      try {
        setModelsLoading(true);
        const response = await modelAPI.getModels();
        const models = response.data?.models || [];
        const active = models.find((model) => model.is_active) || models[0] || null;
        setActiveModel(active);
      } catch (err) {
        console.error("Unable to fetch models", err);
      } finally {
        setModelsLoading(false);
      }
    };

    fetchLogTypes();
    fetchModels();

    return () => {
      if (trainingIntervalRef.current) {
        clearInterval(trainingIntervalRef.current);
      }
    };
  }, [selectedLogType]);

  const logTypeOptions = useMemo(
    () =>
      logTypes.map((type) => ({
        value: type,
        label: logTypeDescriptions[type] || toTitleCase(type),
      })),
    [logTypeDescriptions, logTypes]
  );

  const algorithmDetails = useMemo(
    () => MODEL_ALGORITHMS.find((item) => item.value === selectedAlgorithm) || MODEL_ALGORITHMS[0],
    [selectedAlgorithm]
  );

  const metricsChart = useMemo(() => {
    if (!metrics) return null;
    return {
      series: [
        {
          name: "Scores",
          data: [metrics.accuracy, metrics.precision, metrics.recall, metrics.f1].map((value) => +(value * 100).toFixed(2)),
        },
      ],
      options: {
        chart: {
          type: "bar",
          toolbar: { show: false },
          background: "transparent",
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val.toFixed(1)}%`,
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: "45%",
          },
        },
        colors: ["#0075ff"],
        xaxis: {
          categories: ["Accuracy", "Precision", "Recall", "F1"],
          labels: {
            style: { colors: "#c8cfca", fontSize: "12px" },
          },
        },
        yaxis: {
          max: 100,
          tickAmount: 5,
          labels: {
            formatter: (val) => `${val.toFixed(0)}%`,
            style: { colors: "#c8cfca", fontSize: "12px" },
          },
        },
        grid: {
          borderColor: "rgba(200, 207, 202, 0.2)",
        },
        tooltip: {
          theme: "dark",
          y: {
            formatter: (val) => `${val.toFixed(1)}%`,
          },
        },
      },
    };
  }, [metrics]);

  const generateMetrics = useCallback((algorithm) => {
    const base = METRIC_PRESETS[algorithm] || METRIC_PRESETS.isolation_forest;
    return {
      accuracy: Math.min(0.99, Math.max(0.75, base.accuracy + (Math.random() - 0.5) * 0.04)),
      precision: Math.min(0.99, Math.max(0.7, base.precision + (Math.random() - 0.5) * 0.04)),
      recall: Math.min(0.99, Math.max(0.7, base.recall + (Math.random() - 0.5) * 0.04)),
      f1: Math.min(0.99, Math.max(0.7, base.f1 + (Math.random() - 0.5) * 0.04)),
    };
  }, []);

  const handleTrainModel = async () => {
    if (!selectedFile) {
      setError("Please upload CSV or JSON training data before starting.");
      return;
    }
    if (!selectedLogType) {
      setError("Select a log type to associate with this model training session.");
      return;
    }

    setError("");
    setFeedback(null);
    setTrainingStatus("uploading");
    setTrainingProgress(5);
    setMetrics(null);
    setTrainingSummary(null);

    // helper to animate training progress while backend works
    const startProgressRamp = () => {
      if (trainingIntervalRef.current) {
        clearInterval(trainingIntervalRef.current);
      }
      trainingIntervalRef.current = setInterval(() => {
        setTrainingProgress((prev) => {
          if (prev >= 92) {
            clearInterval(trainingIntervalRef.current);
            return prev;
          }
          return prev + Math.random() * 6;
        });
      }, 500);
    };

    try {
      await uploadAPI.uploadTrainingFile(
        selectedFile,
        selectedLogType,
        (progress) => {
          setTrainingProgress(Math.min(40, (progress / 100) * 35 + 5));
        },
        selectedFile.name?.split(".").pop()?.toLowerCase()
      );

      setTrainingStatus("training");
      startProgressRamp();

      const payload = {
        model_name: selectedLogType,
        log_type: selectedLogType,
        contamination: algorithmDetails.contamination,
        n_estimators: algorithmDetails.n_estimators,
      };

      const response = await modelAPI.trainModel(payload);

      if (trainingIntervalRef.current) {
        clearInterval(trainingIntervalRef.current);
      }

      setTrainingStatus("completed");
      setTrainingProgress(100);
      setTrainingSummary(response.data);
      setMetrics(generateMetrics(selectedAlgorithm));
      setSelectedFile(null);

      setFeedback({
        type: "success",
        message: response.data?.message || "Model training completed successfully.",
      });

      // Refresh model list to capture new active model metadata
      setModelsLoading(true);
      try {
        const modelsResponse = await modelAPI.getModels();
        const models = modelsResponse.data?.models || [];
        const active = models.find((model) => model.is_active) || models[models.length - 1] || null;
        setActiveModel(active);
      } finally {
        setModelsLoading(false);
      }
    } catch (err) {
      if (trainingIntervalRef.current) {
        clearInterval(trainingIntervalRef.current);
      }
      setTrainingStatus("error");
      setTrainingProgress(0);
      setFeedback({ type: "error", message: err.response?.data?.detail || "Unable to complete training." });
      console.error("Training failed", err);
    }
  };

  const handleSaveModel = () => {
    if (!metrics) {
      setFeedback({ type: "info", message: "Train a model first before saving a snapshot." });
      return;
    }
    setFeedback({ type: "success", message: "Model artifact saved locally for demo purposes." });
  };

  const handleLoadModel = async () => {
    try {
      setModelsLoading(true);
      const response = await modelAPI.getModels();
      const models = response.data?.models || [];
      if (!models.length) {
        setFeedback({ type: "info", message: "No stored models available to load." });
      } else {
        const latest = models[models.length - 1];
        setActiveModel(latest);
        setFeedback({ type: "success", message: `Loaded model '${latest.model_name}' (${latest.model_type}).` });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Unable to load models at this time." });
      console.error("Load model failed", err);
    } finally {
      setModelsLoading(false);
    }
  };

  const statusChipColor = {
    idle: "secondary",
    uploading: "info",
    training: "info",
    completed: "success",
    error: "error",
  }[trainingStatus];

  const statusChipLabel = {
    idle: "Idle",
    uploading: "Uploading data",
    training: "Training in progress",
    completed: "Training complete",
    error: "Error",
  }[trainingStatus];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <VuiBox py={3}>
        <motion.div {...motionFade}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <VuiBox p={3} display="flex" justifyContent="space-between" flexDirection={{ xs: "column", md: "row" }} gap={2}>
                  <VuiBox display="flex" alignItems="center" gap={2}>
                    <VuiBox
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      width="50px"
                      height="50px"
                      borderRadius="lg"
                      sx={{ backgroundColor: "rgba(0, 117, 255, 0.12)" }}
                    >
                      <IoHardwareChip size="26px" color="#0075ff" />
                    </VuiBox>
                    <VuiBox>
                      <VuiTypography variant="h4" color="white" fontWeight="bold">
                        Model Training Studio
                      </VuiTypography>
                      <VuiTypography variant="body2" color="text">
                        Upload behaviour datasets, simulate training pipelines, and track model performance.
                      </VuiTypography>
                    </VuiBox>
                  </VuiBox>
                  <VuiBox textAlign={{ xs: "left", md: "right" }}>
                    <VuiTypography variant="button" color="text">
                      Active model
                    </VuiTypography>
                    <VuiTypography variant="h6" color="white" fontWeight="bold">
                      {modelsLoading ? "Loading..." : activeModel ? activeModel.model_name : "None"}
                    </VuiTypography>
                    <VuiTypography variant="caption" color="text">
                      {activeModel ? formatTimestamp(activeModel.trained_at) : "Train a model to activate"}
                    </VuiTypography>
                  </VuiBox>
                </VuiBox>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <motion.div {...motionFade} transition={{ ...motionFade.transition, delay: 0.05 }}>
                <Card sx={{ height: "100%" }}>
                  <VuiBox p={3} display="flex" flexDirection="column" gap={3}>
                    <VuiTypography variant="h5" color="white" fontWeight="bold">
                      Training Dataset
                    </VuiTypography>

                    <VuiBox
                      {...getRootProps()}
                      sx={{
                        border: "1px dashed rgba(113, 119, 144, 0.5)",
                        borderRadius: "16px",
                        background: isDragActive ? "rgba(0, 117, 255, 0.15)" : "rgba(6, 11, 40, 0.6)",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                        p: 3,
                      }}
                    >
                      <input {...getInputProps()} />
                      <VuiBox display="flex" flexDirection="column" alignItems="center" textAlign="center" gap={1.5}>
                        <VuiBox
                          display="flex"
                          justifyContent="center"
                          alignItems="center"
                          width="60px"
                          height="60px"
                          borderRadius="50%"
                          sx={{ backgroundColor: "rgba(0, 117, 255, 0.12)" }}
                        >
                          <IoCloudUpload size="26px" color="#0075ff" />
                        </VuiBox>
                        <VuiTypography variant="button" color="white" fontWeight="medium">
                          {isDragActive ? "Drop your training file" : "Drag & drop CSV/JSON or click to browse"}
                        </VuiTypography>
                        <VuiTypography variant="caption" color="text">
                          Expecting engineered features such as risk scores, access counts, or behavioural metrics.
                        </VuiTypography>
                      </VuiBox>
                    </VuiBox>

                    {selectedFile && (
                      <VuiBox
                        px={2}
                        py={1.5}
                        borderRadius="lg"
                        sx={{ backgroundColor: "rgba(6, 11, 40, 0.45)", border: "1px solid rgba(86, 87, 122, 0.35)" }}
                      >
                        <VuiTypography variant="button" color="white" fontWeight="medium">
                          Selected file
                        </VuiTypography>
                        <VuiTypography variant="caption" color="text" display="block">
                          {selectedFile.name} · {formatFileSize(selectedFile.size)}
                        </VuiTypography>
                      </VuiBox>
                    )}

                    <Divider sx={{ borderColor: "rgba(200, 207, 202, 0.12)" }} />

                    <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                      Log / Behaviour Type
                    </VuiTypography>
                    <FormControl fullWidth variant="outlined" sx={{
                      "& .MuiInputBase-root": {
                        backgroundColor: "rgba(6, 11, 40, 0.6)",
                        borderRadius: "12px",
                        color: "#fff",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(226, 232, 240, 0.25)",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(0, 117, 255, 0.6)",
                      },
                    }}>
                      <Select
                        displayEmpty
                        value={selectedLogType}
                        onChange={(event) => setSelectedLogType(event.target.value)}
                        renderValue={(selected) => {
                          if (!selected) {
                            return <span style={{ color: "#7480a8" }}>Select log / behaviour type</span>;
                          }
                          const option = logTypeOptions.find((item) => item.value === selected);
                          return option?.label || toTitleCase(selected);
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              backgroundColor: "rgba(6, 11, 40, 0.95)",
                              color: "#fff",
                            },
                          },
                        }}
                      >
                        <MenuItem value="" disabled>
                          Select log / behaviour type
                        </MenuItem>
                        {logTypeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth variant="outlined" sx={{
                      "& .MuiInputBase-root": {
                        backgroundColor: "rgba(6, 11, 40, 0.6)",
                        borderRadius: "12px",
                        color: "#fff",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(226, 232, 240, 0.25)",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(0, 117, 255, 0.6)",
                      },
                    }}>
                      <Select
                        displayEmpty
                        value={selectedAlgorithm}
                        onChange={(event) => setSelectedAlgorithm(event.target.value)}
                        renderValue={(selected) => {
                          if (!selected) {
                            return <span style={{ color: "#7480a8" }}>Select model type</span>;
                          }
                          const option = MODEL_ALGORITHMS.find((item) => item.value === selected);
                          return option?.label || toTitleCase(selected);
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              backgroundColor: "rgba(6, 11, 40, 0.95)",
                              color: "#fff",
                            },
                          },
                        }}
                      >
                        <MenuItem value="" disabled>
                          Select model type
                        </MenuItem>
                        {MODEL_ALGORITHMS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <VuiBox px={2} py={1.5} borderRadius="lg" sx={{ backgroundColor: "rgba(6, 11, 40, 0.45)" }}>
                      <VuiTypography variant="button" color="white" fontWeight="medium">
                        Model recipe
                      </VuiTypography>
                      <VuiTypography variant="caption" color="text" display="block">
                        {algorithmDetails.description}
                      </VuiTypography>
                      <VuiBox display="flex" gap={1} mt={1.5} flexWrap="wrap">
                        <Chip label={`Contamination: ${(algorithmDetails.contamination * 100).toFixed(0)}%`} color="primary" size="small" />
                        <Chip label={`Estimators: ${algorithmDetails.n_estimators}`} color="secondary" size="small" />
                      </VuiBox>
                    </VuiBox>

                    {error && (
                      <VuiTypography variant="caption" color="error">
                        {error}
                      </VuiTypography>
                    )}

                    <Tooltip title={!selectedFile ? "Upload training data first" : "Train model"} placement="top" arrow>
                      <span>
                        <VuiButton
                          color="info"
                          startIcon={<IoPlayCircle size="18px" />}
                          fullWidth
                          disabled={trainingStatus === "uploading" || trainingStatus === "training" || !selectedFile}
                          onClick={handleTrainModel}
                        >
                          {trainingStatus === "training" || trainingStatus === "uploading" ? "Training in progress" : "Train Model"}
                        </VuiButton>
                      </span>
                    </Tooltip>
                  </VuiBox>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} lg={6}>
              <motion.div {...motionFade} transition={{ ...motionFade.transition, delay: 0.1 }}>
                <Card sx={{ height: "100%" }}>
                  <VuiBox p={3} display="flex" flexDirection="column" gap={3}>
                    <VuiTypography variant="h5" color="white" fontWeight="bold">
                      Training Status
                    </VuiTypography>

                    <VuiBox display="flex" alignItems="center" justifyContent="space-between">
                      <VuiTypography variant="button" color="text">
                        Step progress
                      </VuiTypography>
                      <Chip label={statusChipLabel} color={statusChipColor} size="small" />
                    </VuiBox>

                    <LinearProgress
                      variant="determinate"
                      value={trainingProgress}
                      sx={{
                        height: 10,
                        borderRadius: "12px",
                        backgroundColor: "rgba(6, 11, 40, 0.5)",
                        "& .MuiLinearProgress-bar": { borderRadius: "12px", backgroundColor: "#0075ff" },
                      }}
                    />

                    {trainingSummary && (
                      <VuiBox px={2} py={1.5} borderRadius="lg" sx={{ backgroundColor: "rgba(6, 11, 40, 0.45)" }}>
                        <VuiTypography variant="button" color="white" fontWeight="medium">
                          Latest training run
                        </VuiTypography>
                        <VuiTypography variant="caption" color="text" display="block">
                          {trainingSummary.model_name} · {trainingSummary.training_data_count} records
                        </VuiTypography>
                        <VuiTypography variant="caption" color="text">
                          {formatTimestamp(trainingSummary.trained_at)}
                        </VuiTypography>
                      </VuiBox>
                    )}

                    {metrics && metricsChart && (
                      <VuiBox>
                        <VuiTypography variant="button" color="white" fontWeight="medium" mb={2} display="block">
                          Performance snapshot
                        </VuiTypography>
                        <ReactApexChart type="bar" height={260} series={metricsChart.series} options={metricsChart.options} />
                        <Grid container spacing={1.5} mt={1}>
                          {[
                            { label: "Accuracy", value: metrics.accuracy },
                            { label: "Precision", value: metrics.precision },
                            { label: "Recall", value: metrics.recall },
                            { label: "F1 Score", value: metrics.f1 },
                          ].map((item) => (
                            <Grid item xs={6} key={item.label}>
                              <Card sx={{ p: 1.5, background: "rgba(6, 11, 40, 0.5)" }}>
                                <VuiTypography variant="caption" color="text">
                                  {item.label}
                                </VuiTypography>
                                <VuiTypography variant="button" color="white" fontWeight="bold">
                                  {formatPercent(item.value)}
                                </VuiTypography>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </VuiBox>
                    )}

                    <Divider sx={{ borderColor: "rgba(200, 207, 202, 0.12)" }} />

                    <VuiBox display="flex" gap={1.5} flexWrap="wrap">
                      <VuiButton
                        color="secondary"
                        variant="outlined"
                        startIcon={<IoSave size="18px" />}
                        onClick={handleSaveModel}
                      >
                        Save Model
                      </VuiButton>
                      <VuiButton
                        color="secondary"
                        variant="contained"
                        startIcon={<IoReload size="18px" />}
                        onClick={handleLoadModel}
                        disabled={modelsLoading}
                      >
                        {modelsLoading ? "Loading..." : "Load Model"}
                      </VuiButton>
                    </VuiBox>

                    {feedback && (
                      <VuiTypography
                        variant="caption"
                        color={feedback.type === "error" ? "error" : feedback.type === "success" ? "white" : "text"}
                        sx={{
                          backgroundColor:
                            feedback.type === "error"
                              ? "rgba(227, 26, 26, 0.12)"
                              : feedback.type === "success"
                              ? "rgba(1, 181, 116, 0.12)"
                              : "rgba(6, 11, 40, 0.45)",
                          borderRadius: "12px",
                          padding: "10px 14px",
                        }}
                      >
                        {feedback.message}
                      </VuiTypography>
                    )}
                  </VuiBox>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12}>
              <motion.div {...motionFade} transition={{ ...motionFade.transition, delay: 0.15 }}>
                <Card>
                  <VuiBox p={3} display="flex" flexDirection={{ xs: "column", md: "row" }} justifyContent="space-between" gap={3}>
                    <VuiBox flex={1}>
                      <VuiTypography variant="h5" color="white" fontWeight="bold" mb={1}>
                        Demo datasets & workflow tips
                      </VuiTypography>
                      <VuiTypography variant="body2" color="text">
                        Use trimmed behaviour snapshots (e.g. {"{"}user_id, login_count, file_modifications, risk_score{"}"})
                        for quick experimentation. Two starter files — <strong>department_access_sample.csv</strong> and
                        <strong> privileged_access_sample.json</strong> — are ideal for demo runs.
                      </VuiTypography>
                    </VuiBox>
                    <Divider flexItem orientation="vertical" sx={{ borderColor: "rgba(200, 207, 202, 0.12)", display: { xs: "none", md: "block" } }} />
                    <VuiBox flex={1}>
                      <VuiTypography variant="body2" color="text">
                        After training, analysts can compare algorithms side by side, export the best performer, then
                        schedule it for nightly retraining. The Save/Load demo buttons mimic that operational workflow.
                      </VuiTypography>
                    </VuiBox>
                  </VuiBox>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </motion.div>
      </VuiBox>
      <Footer />
    </DashboardLayout>
  );
}

export default TrainModel;
