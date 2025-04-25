# -*- coding: utf-8 -*-
{
    'name': "Sales Dashboard",  # Module title
    'version': '17.0.1.0.0',    # Version (Odoo.Major.Minor.Patch.Release)
    'summary': """
        Provides a custom dashboard for sales analysis.""", # Short description
    'description': """
        This module adds a dedicated dashboard view accessible from the Sales menu
        to visualize key sales metrics and performance indicators.
    """, # Longer description
    'author': "Your Name/Company",
    'website': "https://www.yourwebsite.com", # Optional
    'category': 'Sales/Sales', # Category for filtering modules
    'depends': ['base','sale','board','web'],
    'data': [
        # 'security/ir.model.access.csv',
        # 'views/dashboard.xml',
        'views/templates.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'sales_dashboard/static/src/css/dashboard.scss',
            'sales_dashboard/static/src/js/dashboard.js',
            'sales_dashboard/static/src/js/kpi_card.js',
            'sales_dashboard/static/src/js/chart_renderer.js',
            'sales_dashboard/static/src/xml/dashboard.xml',
            'sales_dashboard/static/src/xml/kpi_card.xml',
            'sales_dashboard/static/src/xml/chart_renderer.xml',



        ],
    },
    'installable': True,
    'application': True, # Set to True if it's a standalone application menu
    'auto_install': False,
    'license': 'LGPL-3', # Or 'OEEL-1' if applicable
}