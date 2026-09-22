Report Metadata Entity

# Overview 

The Report Metadata entity stores information that describes a generated or managed report within the marketplace.

It provides the metadata required to identify a report, understand its purpose, track its generation status, and locate or access the generated report when applicable.

# Purpose 

Store information about generated reports.
Identify different types of reports.
Track report generation status.
Store report period and generation information.
Associate reports with the user or administrator who requested them.
Support report history and reporting operations. 

# Owned By

Reporting & Analytics

# Used By 

Admin Dashboard
Seller Management
Order Management
Payment Management
Settlement Management
Product Management
Reporting & Analytics
Super Admin

# Attributes 

Attribute	Description
Report Metadata ID	Unique identifier for the report metadata record
Report Name	Name of the report
Report Type	Type of report
Requested By	User who requested or generated the report
Report Format	Format of the generated report
Period From	Start date of the reporting period
Period To	End date of the reporting period
Status	Current report generation status
File Reference	Reference or location of the generated report file, when applicable
Created At	Record creation timestamp
Updated At	Last modification timestamp 

# Report Types

Possible report types include:

Sales Report
Order Report
Product Report
Seller Report
Payment Report
Refund Report
Settlement Report
Commission Report

Additional report types may be introduced as marketplace reporting requirements expand.

Report Formats

Possible formats include:

CSV
Excel
PDF

The supported formats depend on the reporting requirements of the system.

Report Status

Possible statuses include:

Pending
Processing
Completed
Failed

Only successfully completed reports should be made available for download or further processing.

# Validation Rules 

Report Name is mandatory.
Report Type is mandatory.
Requested By must reference a valid User when applicable.
Report Format must contain a supported format.
Report Status must contain a valid status.
Period From must not be later than Period To.
File Reference must be available when the report status is Completed.
Failed reports must not be treated as successfully generated reports.
Users can access only reports they are authorized to view.
Report metadata must not expose unauthorized financial or marketplace information.

# Business Rules 

A Report Metadata record is created when a report generation request is initiated.
Report generation may occur asynchronously for large reports.
The report status should change as the generation process progresses.
A completed report must have a valid file reference or other mechanism for accessing the generated report.
Failed report generation must be recorded with the appropriate status.
Report data must respect the permissions of the user requesting the report.
Sellers can generate or access only reports containing data they are authorized to view.
Customers should not have access to administrative or seller-level reports unless explicitly permitted.
The Super Admin can generate and access marketplace-level reports according to administrative permissions.
Report metadata should remain available for report history and operational tracking.
Generated reports must not expose sensitive information beyond the user's authorization.
Report metadata may be retained according to the system's reporting and data-retention requirements.
Relationships

A Report Metadata:

Belongs to the User who requested the report.
May reference a generated report file.
User
  │
  └─── 1 : Many ─── Report Metadata
                         │
                         └─── May reference ─── Generated Report File