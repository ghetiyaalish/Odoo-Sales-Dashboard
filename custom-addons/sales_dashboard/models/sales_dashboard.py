from odoo import models, fields, api

class CustomDashboard(models.Model):
    _name = 'custom.dashboard'
    _description = 'Sales Dashboard'

    @api.model
    def get_dashboard_data(self):
        orders = self.env['sale.order'].search([])
        
        if not orders:
            return {
                'total_orders': 0,
                'total_amount': 0,
                'avg_order_value': 0,
                'top_customer': 'No data',
            }

        total_amount = sum(order.amount_total for order in orders)
        
        # Find top customer
        customer_totals = {}
        for order in orders:
            customer_id = order.partner_id.id
            customer_totals[customer_id] = customer_totals.get(customer_id, 0) + order.amount_total
        
        top_customer_id = max(customer_totals, key=customer_totals.get)
        top_customer = self.env['res.partner'].browse(top_customer_id).name

        return {
            'total_orders': len(orders),
            'total_amount': total_amount,
            'avg_order_value': total_amount / len(orders),
            'top_customer': top_customer,
        }