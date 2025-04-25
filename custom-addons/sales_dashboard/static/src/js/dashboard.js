/** @odoo-module */

import { registry } from "@web/core/registry"
import { KpiCard } from "./kpi_card"
import { ChartRenderer } from "./chart_renderer"
import { loadJS } from "@web/core/assets"
import { useService } from "@web/core/utils/hooks"
const { Component, onWillStart, useRef, onMounted, useState } = owl
const { DateTime } = luxon;


// new changes made ----------------------------
const CHART_BG_COLORS = [
    'rgba(54, 162, 235, 0.5)',  // Blue
    'rgba(255, 99, 132, 0.5)',  // Red
    'rgba(255, 205, 86, 0.5)',  // Yellow
    'rgba(75, 192, 192, 0.5)',  // Teal
    'rgba(153, 102, 255, 0.5)', // Purple
    'rgba(255, 159, 64, 0.5)'   // Orange
];
const CHART_BORDER_COLORS = [
    'rgb(54, 162, 235)',
    'rgb(255, 99, 132)',
    'rgb(255, 205, 86)',
    'rgb(75, 192, 192)',
    'rgb(153, 102, 255)',
    'rgb(255, 159, 64)'
];
// --------------------------------------------------
export class OwlSalesDashboard extends Component {
    setup(){
        this.state = useState({
            quotations: {
                value:10,
                percentage:6,
            },
//new changes made ------------------------------------- 
            orders: { // Initialize all sub-properties expected by template
                value: 0,
                percentage: 0,
                revenue: 'Rs 0.00K',
                revenue_percentage: 0,
                average: 'Rs 0.00K',
                average_percentage: 0
           },
           period: 90,
           current_date: null, // Initialize dates
           previous_date: null,

           // --- NEW: State for Chart Data ---
           topProductsData: {},
           topSalesPeopleData: {},
           monthlySalesData: {},
           partnerOrdersData: {},
        })
// -------------------------------------------------------

        this.orm = useService("orm")
        this.actionService = useService("action")

        onWillStart(async ()=>{
            this.getDates()
            await this.getQuotations()
            await this.getOrders()
            await this.fetchData();  //new changes made
        })
    }

    async onChangePeriod(){
        this.getDates()
        await this.getQuotations()
        await this.getOrders()
    }
// new changes made -------------------------------------
    async fetchData() {
        // Use Promise.all to fetch concurrently
        await Promise.all([
           this.getQuotations(),
           this.getOrders(),
           this.getTopProducts(),
           this.getTopSalesPeople(),
           this.getMonthlySales(),
           this.getPartnerOrders() // Assuming bar chart of top partners by revenue
        ]);
   }
// -------------------------------------------------------
    getDates(){
        const now = DateTime.now(); 
        if (this.state.period > 0) {
            this.state.current_date = now.minus({ days: this.state.period }).toFormat('yyyy-MM-dd');
            this.state.previous_date = now.minus({ days: this.state.period * 2 }).toFormat('yyyy-MM-dd');
        }
        else{
            this.state.current_date = null; 
            this.state.previous_date = null;
        }
    }
// new changes made------------------------------------
    _calculatePercentage(current, previous) {
        if (previous === 0 || previous == null) {
            return current > 0 ? Infinity : 0;
        }
        return ((current - previous) / previous) * 100;
    }

    _formatPercentage(p) {
        if (!isFinite(p)) return '∞'; // Check for Infinity
        return p.toFixed(2);
    }

// -----------------------------------------------------

    async getQuotations(){
        let domain = [['state', 'in', ['sent', 'draft']]]
        if (this.state.period > 0){
            domain.push(['date_order','>', this.state.current_date])
        }
        const data = await this.orm.searchCount("sale.order", domain)
        this.state.quotations.value = data

        // previous period
        let prev_domain = [['state', 'in', ['sent', 'draft']]]
        if (this.state.period > 0){
            prev_domain.push(['date_order','>', this.state.previous_date], ['date_order','<=', this.state.current_date])
        }

        const prev_data = await this.orm.searchCount("sale.order", prev_domain)
        const percentage = ((data - prev_data)/prev_data) * 100
        this.state.quotations.percentage = percentage.toFixed(2)
    }

    async getOrders(){
        let domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date_order','>', this.state.current_date])
        }
        const data = await this.orm.searchCount("sale.order", domain)
        //this.state.quotations.value = data

        // previous period
        let prev_domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            prev_domain.push(['date_order','>', this.state.previous_date], ['date_order','<=', this.state.current_date])
        }
        const prev_data = await this.orm.searchCount("sale.order", prev_domain)
        const percentage = ((data - prev_data)/prev_data) * 100
        //this.state.quotations.percentage = percentage.toFixed(2)

        //revenues
        const current_revenue = await this.orm.readGroup("sale.order", domain, ["amount_total:sum"], [])
        const prev_revenue = await this.orm.readGroup("sale.order", prev_domain, ["amount_total:sum"], [])
        const revenue_percentage = ((current_revenue[0].amount_total - prev_revenue[0].amount_total) / prev_revenue[0].amount_total) * 100

        //average
        const current_average = await this.orm.readGroup("sale.order", domain, ["amount_total:avg"], [])
        const prev_average = await this.orm.readGroup("sale.order", prev_domain, ["amount_total:avg"], [])
        const average_percentage = ((current_average[0].amount_total - prev_average[0].amount_total) / prev_average[0].amount_total) * 100

        this.state.orders = {
            value: data,
            percentage: percentage.toFixed(2),
            revenue: `Rs${(current_revenue[0].amount_total/1000).toFixed(2)}K`,
            revenue_percentage: revenue_percentage.toFixed(2),
            average: `Rs${(current_average[0].amount_total/1000).toFixed(2)}K`,
            average_percentage: average_percentage.toFixed(2),
        }

        //this.env.services.company
    }


// new changes made----------------------------------------

    async getTopProducts(){
        let domain = [
            ['order_id.state', 'in', ['sale', 'done']],
            ['display_type', '=', false] // Exclude sections/notes
        ];
        if (this.state.period > 0 && this.state.current_date) {
            domain.push(['order_id.date_order','>', this.state.current_date]);
        }

        const product_data = await this.orm.readGroup(
            "sale.order.line",
            domain,
            ['product_id', 'product_uom_qty:sum'], // Sum quantity
            ['product_id'], // Group by product
            { limit: 5, orderby: 'product_uom_qty desc' } // Get top 5 by qty
        );

        this.state.topProductsData = {
            labels: product_data.map(p => p.product_id ? p.product_id[1] : "N/A"),
            values: product_data.map(p => p.product_uom_qty),
            label: 'Quantity Sold' // Dataset label for tooltip
        };
        console.log("Top Products:", this.state.topProductsData);
    }

    async getTopSalesPeople(){
        let domain = [['state', 'in', ['sale', 'done']]];
        if (this.state.period > 0 && this.state.current_date) {
            domain.push(['date_order','>', this.state.current_date]);
        }

        const sales_data = await this.orm.readGroup(
            "sale.order",
            domain,
            ['user_id', 'amount_total:sum'], // Sum revenue
            ['user_id'], // Group by salesperson (user_id)
            { limit: 5, orderby: 'amount_total desc' } // Top 5 by revenue
        );
        this.state.topSalesPeopleData = {
            labels: sales_data.map(s => s.user_id ? s.user_id[1] : "N/A"),
            values: sales_data.map(s => s.amount_total),
            label: 'Total Revenue' // Dataset label
        };

    }



    async getMonthlySales(){
        let domain = [['state', 'in', ['sale', 'done']]];
        if (this.state.period > 0 && this.state.current_date) {
            domain.push(['date_order','>', this.state.current_date]);
        } else if (this.state.period === 0) {
             const lastYear = DateTime.now().minus({ years: 1 }).toFormat('yyyy-MM-dd');
             domain.push(['date_order', '>', lastYear]);
        }
        
        const monthly_data = await this.orm.readGroup(
            "sale.order",
            domain,
            ['amount_total:sum'],
            ['date_order:month'], // Group by month
            { orderby: 'date_order:month' }
        );

        this.state.monthlySalesData = {
            labels: monthly_data.map(m => m['date_order:month']), // Label is like "July 2024"
            values: monthly_data.map(m => m.amount_total),
            label: 'Monthly Revenue'
        };
        
    }


    async getPartnerOrders(){ // Simplified: Top 5 partners by revenue in the period
        let domain = [['state', 'in', ['sale', 'done']]];
         if (this.state.period > 0 && this.state.current_date) {
            domain.push(['date_order','>', this.state.current_date]);
        }

         const partner_data = await this.orm.readGroup(
            "sale.order",
            domain,
            ['partner_id', 'amount_total:sum'], // Sum revenue
            ['partner_id'], // Group by partner
            { limit: 5, orderby: 'amount_total desc' } // Top 5 by revenue
        );

         this.state.partnerOrdersData = {
            labels: partner_data.map(p => p.partner_id ? p.partner_id[1] : "N/A"),
            values: partner_data.map(p => p.amount_total),
            label: 'Total Revenue'
        };

    }


// --------------------------------------------------------


    async viewQuotations(){
        let domain = [['state', 'in', ['sent', 'draft']]]
        if (this.state.period > 0){
            domain.push(['date_order','>', this.state.current_date])
        }

        let list_view = await this.orm.searchRead("ir.model.data", [['name', '=', 'view_quotation_tree_with_onboarding']], ['res_id'])

        this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "Quotations",
            res_model: "sale.order",
            domain,
            views: [
                [list_view.length > 0 ? list_view[0].res_id : false, "list"],
                [false, "form"],
            ]
        })
    }

    viewOrders(){
        let domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date_order','>', this.state.current_date])
        }

        this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "Quotations",
            res_model: "sale.order",
            domain,
            context: {group_by: ['date_order']},
            views: [
                [false, "list"],
                [false, "form"],
            ]
        })
    }

    viewRevenues(){
        let domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date_order','>', this.state.current_date])
        }

        this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "Quotations",
            res_model: "sale.order",
            domain,
            context: {group_by: ['date_order']},
            views: [
                [false, "pivot"],
                [false, "form"],
            ]
        })
    }
}

OwlSalesDashboard.template = "sales_dashboard.OwlSalesDashboard"
OwlSalesDashboard.components = { KpiCard, ChartRenderer }

registry.category("actions").add("sales_dashboard.sales_dashboard", OwlSalesDashboard)
