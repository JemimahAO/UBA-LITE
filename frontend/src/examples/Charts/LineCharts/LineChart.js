import React from "react";
import ReactApexChart from "react-apexcharts";

class LineChart extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      chartData: this.normalizeSeries(props.lineChartData),
      chartOptions: props.lineChartOptions || {},
    };
  }

  normalizeSeries = (series) => {
    if (!Array.isArray(series) || series.length === 0) {
      return [{ name: "", data: [] }];
    }

    return series.map((item, index) => ({
      name: item?.name ?? `Series ${index + 1}`,
      data: Array.isArray(item?.data) ? item.data : [],
    }));
  };

  componentDidMount() {
    const { lineChartData, lineChartOptions } = this.props;

    this.setState({
      chartData: this.normalizeSeries(lineChartData),
      chartOptions: lineChartOptions || {},
    });
  }

  componentDidUpdate(prevProps) {
    const { lineChartData, lineChartOptions } = this.props;

    if (
      prevProps.lineChartData !== lineChartData ||
      prevProps.lineChartOptions !== lineChartOptions
    ) {
      this.setState({
        chartData: this.normalizeSeries(lineChartData),
        chartOptions: lineChartOptions || {},
      });
    }
  }

  render() {
    return (
      <ReactApexChart
        options={this.state.chartOptions}
        series={this.state.chartData}
        type="area"
        width="100%"
        height="100%"
      />
    );
  }
}

export default LineChart;
