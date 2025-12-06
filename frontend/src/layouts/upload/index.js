import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Grid from "@mui/material/Grid";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiButton from "components/VuiButton";
import VuiProgress from "components/VuiProgress";

// Vision UI Dashboard React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// API
import { uploadAPI, modelAPI, detectionAPI, trainingAPI } from "services/api";

// Icons
import { IoCloudUpload } from "react-icons/io5";
import { IoCheckmarkCircle } from "react-icons/io5";
import { IoCloseCircle } from "react-icons/io5";

function UploadLogs() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [logType, setLogType] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [autoDetect, setAutoDetect] = useState(true);
  const [detectAllModels, setDetectAllModels] = useState(false);
  const [detectionInfo, setDetectionInfo] = useState(null);
  const [detectionError, setDetectionError] = useState("");
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [logTypeOptions, setLogTypeOptions] = useState([]);
  const [loadingLogTypes, setLoadingLogTypes] = useState(true);
  const [contamination] = useState(0.1);
  const [estimators] = useState(100);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        progress: 0,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    },
  });

  const handleUpload = async (fileItem) => {
    setUploading(true);
    try {
      if (!logType) {
        throw new Error('Select a log type before uploading.');
      }
      const response = await uploadAPI.uploadTrainingFile(
        fileItem.file,
        logType,
        (progress) => {
          setUploadProgress(prev => ({ ...prev, [fileItem.id]: progress }));
        }
      );
      
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { 
          ...f, 
          status: 'success',
          rowsProcessed: response.data.rows_processed 
        } : f
      ));

      // Refresh uploaded files list
      await fetchUploadedFiles();

      // Auto-detect if enabled
      if (autoDetect) {
        await runAutoDetection(logType);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Upload failed';
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'error', error: errorMsg } : f
      ));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAll = async () => {
    for (const fileItem of files.filter(f => f.status === 'pending')) {
      await handleUpload(fileItem);
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Fetch uploaded files history
  const fetchUploadedFiles = async () => {
    setLoadingHistory(true);
    try {
      const response = await uploadAPI.getUploadedFiles();
      setUploadedFiles(response.data.files || []);
    } catch (error) {
      console.error('Failed to load uploaded files', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Auto-detection after upload
  const runAutoDetection = async (logType) => {
    setDetectionError("");
    setDetectionInfo(null);
    setDetectionLoading(true);

    try {
      const modelsResponse = await modelAPI.getModels();
      const models = modelsResponse.data.models || [];

      let modelToUse = models.find((m) => m.model_name === logType);

      if (!modelToUse) {
        const trainResponse = await modelAPI.trainModel({
          model_name: logType,
          log_type: logType,
          contamination,
          n_estimators: estimators,
        });

        modelToUse = {
          model_name: trainResponse.data.model_name,
          model_type: "isolation_forest",
        };
      }

      const resultsResponse = await detectionAPI.runDetectionOnStoredLogs({
        model_name: detectAllModels ? undefined : modelToUse.model_name,
        log_type: logType,
        contamination,
        n_estimators: estimators,
        all_models: detectAllModels,
      });

      setDetectionInfo({
        totalLogs: resultsResponse.data.total_logs,
        anomalies: resultsResponse.data.anomalies_found,
        message: resultsResponse.data.message,
        modelName: resultsResponse.data.model_name,
      });

      // Refresh uploaded files history to reflect processed status
      await fetchUploadedFiles();
    } catch (error) {
      console.error('Auto-detection failed:', error);
      setDetectionInfo(null);
      const detail = error.response?.data?.detail;
      setDetectionError(detail || error.message || 'Auto-detection failed');
    } finally {
      setDetectionLoading(false);
    }
  };

  // Load history on mount
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  // Load supported log types
  useEffect(() => {
    const fetchLogTypes = async () => {
      setLoadingLogTypes(true);
      try {
        const response = await trainingAPI.getLogTypes();
        const types = response.data?.log_types || [];
        const descriptions = response.data?.descriptions || {};
        const options = types.map((type) => ({
          value: type,
          label: descriptions[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        }));
        setLogTypeOptions(options);
      } catch (error) {
        console.error('Failed to load log types', error);
      } finally {
        setLoadingLogTypes(false);
      }
    };

    fetchLogTypes();
  }, []);

  // Pick default log type once options arrive
  useEffect(() => {
    if (!logType && logTypeOptions.length) {
      setLogType(logTypeOptions[0].value);
    }
  }, [logType, logTypeOptions]);

  useEffect(() => {
    setDetectionInfo(null);
    setDetectionError("");
  }, [logType]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <VuiBox py={3}>
        <VuiBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <VuiBox p={3}>
                  <VuiTypography variant="h4" color="white" fontWeight="bold" mb={1}>
                    Upload Log Files
                  </VuiTypography>
                  <VuiTypography variant="body2" color="text" mb={3}>
                    Upload CSV or JSON log files for analysis. Supported types come from the backend models so choose the one that matches your dataset.
                  </VuiTypography>

                  <VuiBox>
                    <VuiTypography variant="caption" color="text" fontWeight="medium" mb={1} display="block">
                      Log Type
                    </VuiTypography>
                    <Select
                      value={logType}
                      onChange={(e) => setLogType(e.target.value)}
                      displayEmpty
                      fullWidth
                      disabled={loadingLogTypes || !logTypeOptions.length}
                      renderValue={(value) => {
                        if (!value) {
                          return loadingLogTypes ? 'Loading log types…' : 'Select log type';
                        }
                        const match = logTypeOptions.find((option) => option.value === value);
                        return match ? match.label : value;
                      }}
                      sx={{
                        maxWidth: 320,
                        backgroundColor: 'rgba(6, 11, 40, 0.6)',
                        borderRadius: '12px',
                        color: '#fff',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(226, 232, 240, 0.25)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 117, 255, 0.6)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 117, 255, 0.85)',
                        },
                        '& .MuiSelect-select': {
                          paddingTop: '14px',
                          paddingBottom: '14px',
                        },
                        '& .MuiSelect-icon': {
                          color: '#0075FF',
                        },
                      }}
                    >
                      {logTypeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </VuiBox>

                  <VuiBox display="flex" alignItems="center" gap={1.5} mt={2}>
                    <Switch
                      checked={autoDetect}
                      onChange={(event) => setAutoDetect(event.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#0075FF',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: 'rgba(0, 117, 255, 0.4)',
                        },
                      }}
                    />
                    <VuiTypography variant="button" color="white" fontWeight="medium">
                      Auto-detect anomalies after upload
                    </VuiTypography>
                  </VuiBox>

                  <VuiBox display="flex" alignItems="center" gap={1.5} mt={1}>
                    <Switch
                      checked={detectAllModels}
                      onChange={(event) => setDetectAllModels(event.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#FFB547',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: 'rgba(255, 181, 71, 0.4)',
                        },
                      }}
                    />
                    <VuiTypography variant="caption" color="text">
                      When enabled, runs this dataset across all available insider-threat models (e.g. large transfers, DB access, privileged misuse) instead of just the selected type.
                    </VuiTypography>
                  </VuiBox>

                  {(detectionLoading || detectionInfo || detectionError) && (
                    <VuiBox mt={2} p={2} sx={{ backgroundColor: 'rgba(6, 11, 40, 0.6)', borderRadius: '12px', border: '1px solid rgba(86, 87, 122, 0.3)' }}>
                      {detectionLoading && (
                        <VuiTypography variant="caption" color="text">
                          Running anomaly detection...
                        </VuiTypography>
                      )}
                      {!detectionLoading && detectionError && (
                        <VuiTypography variant="caption" color="error">
                          {detectionError}
                        </VuiTypography>
                      )}
                      {!detectionLoading && detectionInfo && (
                        <VuiTypography variant="caption" color="success">
                          {detectionInfo.message}
                          {" "}
                          {detectionInfo.modelName && detectionInfo.modelName !== 'multiple'
                            ? `— ${detectionInfo.anomalies} anomalies found out of ${detectionInfo.totalLogs} events using model "${detectionInfo.modelName}".`
                            : `— ${detectionInfo.anomalies} anomalies found out of ${detectionInfo.totalLogs} events across multiple models.`}
                        </VuiTypography>
                      )}
                    </VuiBox>
                  )}
                </VuiBox>
              </Card>
            </Grid>
          </Grid>
        </VuiBox>

        {/* Dropzone */}
        <VuiBox mb={3}>
          <Card>
            <VuiBox p={3}>
              <div
                {...getRootProps()}
                style={{
                  border: '2px dashed rgba(0, 117, 255, 0.5)',
                  borderRadius: '16px',
                  padding: '60px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? 'rgba(0, 117, 255, 0.1)' : 'rgba(6, 11, 40, 0.5)',
                  transition: 'all 0.3s ease',
                }}
              >
                <input {...getInputProps()} />
                <IoCloudUpload size="60px" color="#0075ff" style={{ marginBottom: '16px' }} />
                <VuiTypography variant="h5" color="white" fontWeight="bold" mb={1}>
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </VuiTypography>
                <VuiTypography variant="body2" color="text">
                  or click to browse (CSV, JSON files only)
                </VuiTypography>
              </div>
            </VuiBox>
          </Card>
        </VuiBox>

        {/* File List */}
        {files.length > 0 && (
          <VuiBox mb={3}>
            <Card>
              <VuiBox p={3}>
                <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <VuiTypography variant="h5" color="white" fontWeight="bold">
                    Files ({files.length})
                  </VuiTypography>
                  <VuiButton
                    color="info"
                    onClick={handleUploadAll}
                    disabled={uploading || files.every(f => f.status !== 'pending')}
                  >
                    Upload All
                  </VuiButton>
                </VuiBox>

                <VuiBox>
                  {files.map((fileItem) => (
                    <VuiBox
                      key={fileItem.id}
                      mb={2}
                      p={2}
                      sx={{
                        backgroundColor: 'rgba(6, 11, 40, 0.5)',
                        borderRadius: '12px',
                        border: '1px solid rgba(86, 87, 122, 0.3)',
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                          <VuiTypography variant="button" color="white" fontWeight="medium">
                            {fileItem.file.name}
                          </VuiTypography>
                          <VuiTypography variant="caption" color="text" display="block">
                            {(fileItem.file.size / 1024).toFixed(2)} KB
                          </VuiTypography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          {fileItem.status === 'pending' && (
                            <VuiButton
                              color="info"
                              size="small"
                              onClick={() => handleUpload(fileItem)}
                              disabled={uploading}
                            >
                              Upload
                            </VuiButton>
                          )}
                          {fileItem.status === 'success' && (
                            <VuiBox display="flex" alignItems="center">
                              <IoCheckmarkCircle size="20px" color="#01b574" />
                              <VuiTypography variant="caption" color="success" ml={1}>
                                Uploaded {fileItem.rowsProcessed ? `(${fileItem.rowsProcessed} rows)` : ''}
                              </VuiTypography>
                            </VuiBox>
                          )}
                          {fileItem.status === 'error' && (
                            <VuiBox display="flex" alignItems="center">
                              <IoCloseCircle size="20px" color="#e31a1a" />
                              <VuiTypography variant="caption" color="error" ml={1}>
                                Failed
                              </VuiTypography>
                            </VuiBox>
                          )}
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Icon
                            sx={{ cursor: 'pointer', color: '#e31a1a' }}
                            onClick={() => removeFile(fileItem.id)}
                          >
                            delete
                          </Icon>
                        </Grid>
                      </Grid>
                      {uploadProgress[fileItem.id] > 0 && uploadProgress[fileItem.id] < 100 && (
                        <VuiBox mt={2}>
                          <VuiProgress
                            value={uploadProgress[fileItem.id]}
                            color="info"
                            label
                          />
                        </VuiBox>
                      )}
                    </VuiBox>
                  ))}
                </VuiBox>
              </VuiBox>
            </Card>
          </VuiBox>
        )}

        {/* Uploaded Files History */}
        <VuiBox mb={3}>
          <Card>
            <VuiBox p={3}>
              <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <VuiTypography variant="h5" color="white" fontWeight="bold">
                  Upload History
                </VuiTypography>
                <VuiTypography variant="caption" color="text">
                  {loadingHistory ? 'Loading…' : `${uploadedFiles.length} file${uploadedFiles.length === 1 ? '' : 's'}`}
                </VuiTypography>
              </VuiBox>

              {loadingHistory ? (
                <VuiBox display="flex" flexDirection="column" gap={1.5}>
                  {[...Array(3)].map((_, index) => (
                    <VuiBox
                      key={index}
                      sx={{
                        height: '60px',
                        backgroundColor: 'rgba(6, 11, 40, 0.5)',
                        borderRadius: '12px',
                        border: '1px solid rgba(86, 87, 122, 0.3)',
                      }}
                    />
                  ))}
                </VuiBox>
              ) : uploadedFiles.length === 0 ? (
                <VuiBox textAlign="center" py={4}>
                  <VuiTypography variant="body2" color="text">
                    No uploaded files yet. Upload logs to build your dataset.
                  </VuiTypography>
                </VuiBox>
              ) : (
                <VuiBox
                  sx={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                      height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'rgba(6, 11, 40, 0.5)',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(0, 117, 255, 0.5)',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: 'rgba(0, 117, 255, 0.7)',
                    },
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.15)' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>
                          <VuiTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
                            Filename
                          </VuiTypography>
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>
                          <VuiTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
                            Log Type
                          </VuiTypography>
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>
                          <VuiTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
                            Rows
                          </VuiTypography>
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>
                          <VuiTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
                            Size
                          </VuiTypography>
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>
                          <VuiTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
                            Uploaded
                          </VuiTypography>
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>
                          <VuiTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
                            Status
                          </VuiTypography>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedFiles.map((file) => (
                        <tr key={file.id} style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.08)' }}>
                          <td style={{ padding: '12px' }}>
                            <VuiTypography variant="button" color="white" fontWeight="medium">
                              {file.filename}
                            </VuiTypography>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <VuiTypography variant="caption" color="text">
                              {file.log_type || '—'}
                            </VuiTypography>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <VuiTypography variant="caption" color="white" fontWeight="medium">
                              {file.rows_processed != null ? file.rows_processed.toLocaleString() : '—'}
                            </VuiTypography>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <VuiTypography variant="caption" color="white" fontWeight="medium">
                              {file.file_size != null ? `${(file.file_size / 1024).toFixed(2)} KB` : '—'}
                            </VuiTypography>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <VuiTypography variant="caption" color="text">
                              {file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : '—'}
                            </VuiTypography>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <VuiTypography
                              variant="caption"
                              color={file.status === 'failed' ? 'error' : file.status === 'processed' ? 'info' : 'success'}
                              fontWeight="medium"
                            >
                              {file.status || '—'}
                            </VuiTypography>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </VuiBox>
              )}
            </VuiBox>
          </Card>
        </VuiBox>
      </VuiBox>
      <Footer />
    </DashboardLayout>
  );
}

export default UploadLogs;
