/** @odoo-module */

import { registry } from "@web/core/registry"
import { loadJS } from "@web/core/assets"
const { Component, onWillStart, useRef, onMounted ,onWillUnmount,onPatched} = owl

const CHART_BG_COLORS = [
    'rgba(251, 10, 58, 0.41)', 'rgba(255, 99, 132, 0.5)', 'rgba(255, 205, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)', 'rgba(153, 102, 255, 0.5)', 'hsla(30, 100.00%, 62.50%, 0.50)'
];
const CHART_BORDER_COLORS = [
    'rgb(235, 54, 102)', 'rgb(255, 99, 132)', 'rgb(255, 205, 86)',
    'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)'
];

export class ChartRenderer extends Component {
    setup(){
        this.chartRef = useRef("chart")
        this.chartInstance = null;
        onWillStart(async ()=>{
            await loadJS("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js")
        })

        onMounted(()=>this.renderChart());
        onPatched(() => {
            // console.log("ChartRenderer patched, re-rendering chart for:", this.props.title);
            this.renderChart();
        });
        onWillUnmount(() => {
            // Destroy chart instance when component is removed
           if (this.chartInstance) {
               this.chartInstance.destroy();
                this.chartInstance = null;
           }
       });
    }

    renderChart(){

        // Destroy existing chart instance if it exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const canvasElement = this.chartRef.el;

        if (!canvasElement || !this.props.chartData || !this.props.chartData.labels || !this.props.chartData.values || this.props.chartData.labels.length === 0) {
            console.warn("ChartRenderer: Canvas or chart data not ready/empty for:", this.props.title);
            if (canvasElement) { // Clear canvas if no data
                 const ctx = canvasElement.getContext('2d');
                 ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            }
            return;
        }

        const ctx = canvasElement.getContext('2d');

        const chartData = {labels: this.props.chartData.labels,
            datasets: [{
                label: this.props.chartData.label || 'Dataset',
                data: this.props.chartData.values,
                backgroundColor: CHART_BG_COLORS.slice(0, this.props.chartData.values.length),
                borderColor: CHART_BORDER_COLORS.slice(0, this.props.chartData.values.length),
                borderWidth: 1,
                hoverOffset: 4
            }]
       };

        this.chartInstance = new Chart(ctx, {
            type: this.props.type,
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: this.props.type === 'pie' || this.props.type === 'doughnut',
                        position: 'bottom',
                    },
                    title: {
                        display: !!this.props.title,
                        text: this.props.title || '',
                        position: 'bottom',
                        padding: { top: 10 }
                    },
                    // Basic default tooltip is usually sufficient
                    // tooltip: { // You can add simple callbacks if needed later }
                },
                scales: {
                     y: {
                         display: this.props.type === 'bar' || this.props.type === 'line',
                         beginAtZero: true
                     },
                     x: {
                         display: this.props.type === 'bar' || this.props.type === 'line',
                     }
                 }
            },
        });

    }
}

ChartRenderer.template = "sales_dashboard.ChartRenderer"
ChartRenderer.props = {
    type: String,
    title: { type: String, optional: true },
    chartData: { type: Object, optional: true }, // Expects { labels: [], values: [], ?label: "" }
};