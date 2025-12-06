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

import React, { Component } from "react";
import Chart from "react-apexcharts";

class BarChart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      chartData: this.normalizeSeries(props.barChartData),
      chartOptions: props.barChartOptions || {},
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
    const { barChartData, barChartOptions } = this.props;

    this.setState({
      chartData: this.normalizeSeries(barChartData),
      chartOptions: barChartOptions || {},
    });
  }

  componentDidUpdate(prevProps) {
    const { barChartData, barChartOptions } = this.props;

    if (
      prevProps.barChartData !== barChartData ||
      prevProps.barChartOptions !== barChartOptions
    ) {
      this.setState({
        chartData: this.normalizeSeries(barChartData),
        chartOptions: barChartOptions || {},
      });
    }
  }

  render() {
    return (
      <Chart
        options={this.state.chartOptions}
        series={this.state.chartData}
        type="bar"
        width="100%"
        height="100%"
      />
    );
  }
}

export default BarChart;
