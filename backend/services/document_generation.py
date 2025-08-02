"""
Document Generation Service
Creates PDF and Word documents from templates for farmers
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from config_document_builder import DocumentBuilderConfig

# PDF generation libraries
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

try:
    import weasyprint
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    WEASYPRINT_AVAILABLE = False

logger = logging.getLogger(__name__)

class DocumentGenerationService:
    """Service for generating documents from templates"""
    
    def __init__(self):
        self.config = DocumentBuilderConfig()
        
    def generate_document(self, document_type: str, farmer_data: Dict[str, Any], format_type: str = "pdf") -> Dict[str, Any]:
        """
        Generate document from template and farmer data
        
        Args:
            document_type: Type of document to generate
            farmer_data: Data to fill in the template
            format_type: Output format (pdf, docx, html)
            
        Returns:
            Dict with success status, file_path, and any errors
        """
        try:
            # Check if document type is supported
            if document_type not in self.config.DOCUMENT_TEMPLATES:
                return {
                    "success": False,
                    "error": f"Document type '{document_type}' not supported",
                    "available_types": list(self.config.DOCUMENT_TEMPLATES.keys())
                }
            
            template_info = self.config.DOCUMENT_TEMPLATES[document_type]
            
            # Generate document content
            document_content = self._create_document_content(document_type, farmer_data, template_info)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            farmer_name = farmer_data.get('farmer_name', 'farmer').replace(' ', '_')
            filename = f"{document_type}_{farmer_name}_{timestamp}.{format_type}"
            file_path = os.path.join(self.config.DOCUMENT_OUTPUT_DIR, filename)
            
            # Generate document based on format
            if format_type.lower() == "pdf":
                result = self._generate_pdf(document_content, file_path, template_info)
            elif format_type.lower() == "docx":
                result = self._generate_docx(document_content, file_path, template_info)
            elif format_type.lower() == "html":
                result = self._generate_html(document_content, file_path, template_info)
            else:
                return {
                    "success": False,
                    "error": f"Format '{format_type}' not supported",
                    "supported_formats": ["pdf", "docx", "html"]
                }
            
            if result["success"]:
                return {
                    "success": True,
                    "file_path": file_path,
                    "filename": filename,
                    "document_type": document_type,
                    "format": format_type,
                    "generated_at": datetime.now().isoformat()
                }
            else:
                return result
                
        except Exception as e:
            logger.error(f"Error generating document: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _create_document_content(self, document_type: str, farmer_data: Dict[str, Any], template_info: Dict[str, Any]) -> Dict[str, Any]:
        """Create structured document content"""
        
        # Common header information
        document_content = {
            "header": {
                "title": template_info["name"],
                "description": template_info["description"],
                "generated_date": datetime.now().strftime("%d/%m/%Y"),
                "generated_time": datetime.now().strftime("%I:%M %p")
            },
            "farmer_info": {},
            "document_data": {},
            "footer": {
                "generated_by": "Farmer Assistant App",
                "disclaimer": "This document is generated for application purposes. Please verify all information before submission."
            }
        }
        
        # Extract farmer information
        document_content["farmer_info"] = {
            "name": farmer_data.get('farmer_name', ''),
            "aadhaar_number": farmer_data.get('aadhaar_number', ''),
            "contact_number": farmer_data.get('contact_number', ''),
            "address": farmer_data.get('address', ''),
            "bank_details": farmer_data.get('bank_details', {})
        }
        
        # Document-specific content
        if document_type == "loan_application":
            document_content["document_data"] = {
                "loan_amount": farmer_data.get('loan_amount', ''),
                "loan_purpose": farmer_data.get('loan_purpose', ''),
                "land_details": farmer_data.get('land_details', {}),
                "scheme_name": farmer_data.get('scheme_name', ''),
                "repayment_period": farmer_data.get('repayment_period', ''),
                "collateral_details": farmer_data.get('collateral_details', '')
            }
            
        elif document_type == "subsidy_application":
            document_content["document_data"] = {
                "scheme_name": farmer_data.get('scheme_name', ''),
                "subsidy_amount": farmer_data.get('subsidy_amount', ''),
                "equipment_type": farmer_data.get('equipment_type', ''),
                "land_records": farmer_data.get('land_records', {}),
                "dealer_details": farmer_data.get('dealer_details', {})
            }
            
        elif document_type == "crop_insurance":
            document_content["document_data"] = {
                "crop_details": farmer_data.get('crop_details', {}),
                "land_details": farmer_data.get('land_details', {}),
                "insurance_amount": farmer_data.get('insurance_amount', ''),
                "season": farmer_data.get('season', ''),
                "sowing_date": farmer_data.get('sowing_date', '')
            }
            
        else:
            # General document data
            document_content["document_data"] = {
                "purpose": farmer_data.get('purpose', ''),
                "scheme_name": farmer_data.get('scheme_name', ''),
                "supporting_documents": farmer_data.get('supporting_documents', [])
            }
        
        # 🤖 Add AI assistance section if available
        if 'ai_assistance' in farmer_data:
            ai_data = farmer_data['ai_assistance']
            document_content["ai_assistance"] = {
                "user_question": ai_data.get('user_question', ''),
                "ai_response": ai_data.get('ai_response', ''),
                "relevant_schemes": ai_data.get('relevant_schemes', []),
                "consultation_date": ai_data.get('consultation_date', ''),
                "consultation_time": ai_data.get('consultation_time', ''),
                "ai_model": ai_data.get('ai_model', 'Gemini AI')
            }
        
        # 💬 Add AI chat session if available (for multiple conversations)
        if 'ai_chat_session' in farmer_data:
            chat_data = farmer_data['ai_chat_session']
            document_content["ai_chat_session"] = {
                "total_questions": chat_data.get('total_questions', 0),
                "conversation_summary": chat_data.get('conversation_summary', []),
                "session_date": chat_data.get('session_date', ''),
                "session_time": chat_data.get('session_time', ''),
                "ai_model": chat_data.get('ai_model', 'Gemini AI'),
                "note": chat_data.get('note', '')
            }
        
        return document_content

    def _generate_pdf(self, content: Dict[str, Any], file_path: str, template_info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate PDF document using reportlab or weasyprint"""
        try:
            # Method 1: Try weasyprint first (HTML to PDF conversion)
            if WEASYPRINT_AVAILABLE:
                return self._generate_pdf_weasyprint(content, file_path, template_info)
            
            # Method 2: Try reportlab (programmatic PDF generation)
            elif REPORTLAB_AVAILABLE:
                return self._generate_pdf_reportlab(content, file_path, template_info)
            
            # Fallback: Generate HTML first, then inform user
            else:
                html_file_path = file_path.replace('.pdf', '.html')
                html_result = self._generate_html(content, html_file_path, template_info)
                
                if html_result["success"]:
                    return {
                        "success": True,
                        "message": "PDF libraries not available. Generated HTML version instead.",
                        "html_file": html_file_path,
                        "note": "Install 'reportlab' or 'weasyprint' for direct PDF generation"
                    }
                else:
                    return html_result
            
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _generate_pdf_weasyprint(self, content: Dict[str, Any], file_path: str, template_info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate PDF using weasyprint (HTML to PDF conversion)"""
        try:
            # Create styled HTML content for better PDF output
            html_content = self._create_pdf_html_content(content)
            
            # Generate PDF from HTML
            weasyprint.HTML(string=html_content).write_pdf(file_path)
            
            return {
                "success": True,
                "message": "PDF document generated successfully using weasyprint"
            }
            
        except Exception as e:
            logger.error(f"Error generating PDF with weasyprint: {e}")
            return {
                "success": False,
                "error": f"Weasyprint PDF generation failed: {str(e)}"
            }

    def _generate_pdf_reportlab(self, content: Dict[str, Any], file_path: str, template_info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate PDF using reportlab (programmatic generation)"""
        try:
            # Create PDF document
            doc = SimpleDocTemplate(file_path, pagesize=A4, topMargin=0.5*inch)
            story = []
            
            # Get styles
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=30,
                alignment=TA_CENTER,
                textColor=colors.darkblue
            )
            
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=14,
                spaceBefore=20,
                spaceAfter=10,
                textColor=colors.darkgreen
            )
            
            normal_style = styles['Normal']
            
            # Header
            header = content.get("header", {})
            story.append(Paragraph(header.get('title', 'DOCUMENT'), title_style))
            story.append(Paragraph(f"Generated on: {header.get('generated_date', '')} at {header.get('generated_time', '')}", normal_style))
            story.append(Spacer(1, 20))
            
            # Farmer Information
            story.append(Paragraph("FARMER INFORMATION", heading_style))
            farmer_info = content.get("farmer_info", {})
            
            farmer_data = [
                ["Name:", farmer_info.get('name', '')],
                ["Aadhaar Number:", farmer_info.get('aadhaar_number', '')],
                ["Contact Number:", farmer_info.get('contact_number', '')],
                ["Address:", farmer_info.get('address', '')]
            ]
            
            farmer_table = Table(farmer_data, colWidths=[2*inch, 4*inch])
            farmer_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            
            story.append(farmer_table)
            story.append(Spacer(1, 20))
            
            # Document Data
            story.append(Paragraph("APPLICATION DETAILS", heading_style))
            document_data = content.get("document_data", {})
            
            for key, value in document_data.items():
                if isinstance(value, dict):
                    story.append(Paragraph(f"{key.replace('_', ' ').title()}:", normal_style))
                    for sub_key, sub_value in value.items():
                        story.append(Paragraph(f"  • {sub_key.replace('_', ' ').title()}: {sub_value}", normal_style))
                else:
                    story.append(Paragraph(f"{key.replace('_', ' ').title()}: {value}", normal_style))
            
            story.append(Spacer(1, 20))
            
            # 🤖 AI Assistance Section (if available)
            if "ai_assistance" in content:
                ai_data = content["ai_assistance"]
                story.append(Paragraph("🤖 AI ASSISTANCE", heading_style))
                
                # User question
                story.append(Paragraph(f"Question: {ai_data.get('user_question', '')}", normal_style))
                story.append(Spacer(1, 10))
                
                # AI response
                ai_response = ai_data.get('ai_response', '')
                story.append(Paragraph(f"AI Response:", ParagraphStyle(
                    'AIResponseLabel',
                    parent=normal_style,
                    fontName='Helvetica-Bold',
                    textColor=colors.darkgreen
                )))
                story.append(Paragraph(ai_response, normal_style))
                story.append(Spacer(1, 10))
                
                # Relevant schemes
                schemes = ai_data.get('relevant_schemes', [])
                if schemes:
                    story.append(Paragraph("Relevant Government Schemes:", ParagraphStyle(
                        'SchemesLabel',
                        parent=normal_style,
                        fontName='Helvetica-Bold',
                        textColor=colors.darkblue
                    )))
                    for scheme in schemes:
                        story.append(Paragraph(f"• {scheme}", normal_style))
                
                # Consultation details
                consultation_info = f"Consultation Date: {ai_data.get('consultation_date', '')} at {ai_data.get('consultation_time', '')} | Model: {ai_data.get('ai_model', '')}"
                story.append(Paragraph(consultation_info, ParagraphStyle(
                    'ConsultationInfo',
                    parent=normal_style,
                    fontSize=8,
                    textColor=colors.grey
                )))
                
                story.append(Spacer(1, 20))
            
            # 💬 AI Chat Session Section (if available)
            if "ai_chat_session" in content:
                chat_data = content["ai_chat_session"]
                story.append(Paragraph("💬 AI CHAT SESSION SUMMARY", heading_style))
                
                story.append(Paragraph(f"Total Questions: {chat_data.get('total_questions', 0)}", normal_style))
                story.append(Paragraph(f"Session: {chat_data.get('session_date', '')} at {chat_data.get('session_time', '')}", normal_style))
                story.append(Spacer(1, 10))
                
                # Conversation summary
                conversations = chat_data.get('conversation_summary', [])
                for i, conv in enumerate(conversations, 1):
                    story.append(Paragraph(f"Q{i}: {conv.get('question', '')}", ParagraphStyle(
                        'QuestionStyle',
                        parent=normal_style,
                        fontName='Helvetica-Bold',
                        textColor=colors.darkred
                    )))
                    story.append(Paragraph(f"A{i}: {conv.get('ai_response', '')}", normal_style))
                    
                    schemes = conv.get('relevant_schemes', [])
                    if schemes:
                        story.append(Paragraph(f"Related Schemes: {', '.join(schemes)}", ParagraphStyle(
                            'RelatedSchemes',
                            parent=normal_style,
                            fontSize=8,
                            textColor=colors.darkblue
                        )))
                    story.append(Spacer(1, 10))
                
                # Note
                note = chat_data.get('note', '')
                if note:
                    story.append(Paragraph(note, ParagraphStyle(
                        'ChatNote',
                        parent=normal_style,
                        fontSize=8,
                        textColor=colors.grey,
                        alignment=TA_CENTER
                    )))
                
                story.append(Spacer(1, 20))
            
            # Footer
            footer = content.get("footer", {})
            story.append(Paragraph(f"Generated by: {footer.get('generated_by', '')}", normal_style))
            story.append(Paragraph(f"Disclaimer: {footer.get('disclaimer', '')}", normal_style))
            
            # Build PDF
            doc.build(story)
            
            return {
                "success": True,
                "message": "PDF document generated successfully using reportlab"
            }
            
        except Exception as e:
            logger.error(f"Error generating PDF with reportlab: {e}")
            return {
                "success": False,
                "error": f"Reportlab PDF generation failed: {str(e)}"
            }

    def _generate_docx(self, content: Dict[str, Any], file_path: str, template_info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate Word document (fallback to simple text format)"""
        try:
            # Simple text-based document generation (fallback)
            # In production, you would use python-docx
            
            docx_content = self._create_text_content(content)
            
            # For now, save as text file with .docx extension
            with open(file_path.replace('.docx', '.txt'), 'w', encoding='utf-8') as f:
                f.write(docx_content)
            
            return {
                "success": True,
                "message": "Document generated successfully (text format)",
                "note": "DOCX generation requires additional libraries. Generated as text file for now."
            }
            
        except Exception as e:
            logger.error(f"Error generating DOCX: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _generate_html(self, content: Dict[str, Any], file_path: str, template_info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate HTML document"""
        try:
            html_content = self._create_html_content(content)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            return {
                "success": True,
                "message": "HTML document generated successfully"
            }
            
        except Exception as e:
            logger.error(f"Error generating HTML: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _create_text_content(self, content: Dict[str, Any]) -> str:
        """Create plain text content for document"""
        text_lines = []
        
        # Header
        header = content.get("header", {})
        text_lines.append("=" * 60)
        text_lines.append(f"          {header.get('title', 'DOCUMENT')}")
        text_lines.append("=" * 60)
        text_lines.append(f"Generated on: {header.get('generated_date', '')} at {header.get('generated_time', '')}")
        text_lines.append("")
        
        # Farmer Information
        farmer_info = content.get("farmer_info", {})
        text_lines.append("FARMER INFORMATION:")
        text_lines.append("-" * 30)
        text_lines.append(f"Name: {farmer_info.get('name', '')}")
        text_lines.append(f"Aadhaar Number: {farmer_info.get('aadhaar_number', '')}")
        text_lines.append(f"Contact Number: {farmer_info.get('contact_number', '')}")
        text_lines.append(f"Address: {farmer_info.get('address', '')}")
        text_lines.append("")
        
        # Document Data
        document_data = content.get("document_data", {})
        text_lines.append("APPLICATION DETAILS:")
        text_lines.append("-" * 30)
        for key, value in document_data.items():
            if isinstance(value, dict):
                text_lines.append(f"{key.replace('_', ' ').title()}:")
                for sub_key, sub_value in value.items():
                    text_lines.append(f"  {sub_key.replace('_', ' ').title()}: {sub_value}")
            else:
                text_lines.append(f"{key.replace('_', ' ').title()}: {value}")
        text_lines.append("")
        
        # Footer
        footer = content.get("footer", {})
        text_lines.append("=" * 60)
        text_lines.append(f"Generated by: {footer.get('generated_by', '')}")
        text_lines.append(f"Disclaimer: {footer.get('disclaimer', '')}")
        text_lines.append("=" * 60)
        
        return "\n".join(text_lines)

    def _create_html_content(self, content: Dict[str, Any]) -> str:
        """Create HTML content for document"""
        header = content.get("header", {})
        farmer_info = content.get("farmer_info", {})
        document_data = content.get("document_data", {})
        footer = content.get("footer", {})
        
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{header.get('title', 'Document')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
        .header {{ text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }}
        .section {{ margin-bottom: 30px; }}
        .section-title {{ font-size: 18px; font-weight: bold; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }}
        .field {{ margin: 10px 0; }}
        .label {{ font-weight: bold; color: #555; }}
        .footer {{ text-align: center; border-top: 1px solid #ccc; padding-top: 20px; margin-top: 40px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{header.get('title', 'DOCUMENT')}</h1>
        <p>{header.get('description', '')}</p>
        <p>Generated on: {header.get('generated_date', '')} at {header.get('generated_time', '')}</p>
    </div>
    
    <div class="section">
        <div class="section-title">FARMER INFORMATION</div>
        <div class="field"><span class="label">Name:</span> {farmer_info.get('name', '')}</div>
        <div class="field"><span class="label">Aadhaar Number:</span> {farmer_info.get('aadhaar_number', '')}</div>
        <div class="field"><span class="label">Contact Number:</span> {farmer_info.get('contact_number', '')}</div>
        <div class="field"><span class="label">Address:</span> {farmer_info.get('address', '')}</div>
    </div>
    
    <div class="section">
        <div class="section-title">APPLICATION DETAILS</div>
"""
        
        # Add document data fields
        for key, value in document_data.items():
            if isinstance(value, dict):
                html_content += f'        <div class="field"><span class="label">{key.replace("_", " ").title()}:</span></div>\n'
                for sub_key, sub_value in value.items():
                    html_content += f'        <div class="field" style="margin-left: 20px;"><span class="label">{sub_key.replace("_", " ").title()}:</span> {sub_value}</div>\n'
            else:
                html_content += f'        <div class="field"><span class="label">{key.replace("_", " ").title()}:</span> {value}</div>\n'
        
        html_content += f"""
    </div>
    
    <div class="footer">
        <p>Generated by: {footer.get('generated_by', '')}</p>
        <p>{footer.get('disclaimer', '')}</p>
    </div>
</body>
</html>
"""
        
        return html_content

    def _create_pdf_html_content(self, content: Dict[str, Any]) -> str:
        """Create HTML content optimized for PDF generation"""
        header = content.get("header", {})
        farmer_info = content.get("farmer_info", {})
        document_data = content.get("document_data", {})
        footer = content.get("footer", {})
        
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{header.get('title', 'Document')}</title>
    <style>
        @page {{
            size: A4;
            margin: 1in;
        }}
        body {{ 
            font-family: 'Arial', sans-serif; 
            font-size: 12px;
            line-height: 1.6; 
            color: #333;
        }}
        .header {{ 
            text-align: center; 
            border-bottom: 3px solid #2c5282; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }}
        .header h1 {{
            color: #2c5282;
            font-size: 24px;
            margin-bottom: 10px;
        }}
        .header p {{
            color: #666;
            font-size: 11px;
        }}
        .section {{ 
            margin-bottom: 25px; 
            break-inside: avoid;
        }}
        .section-title {{ 
            font-size: 16px; 
            font-weight: bold; 
            color: #2d5016; 
            border-bottom: 2px solid #68d391; 
            padding-bottom: 5px; 
            margin-bottom: 15px;
        }}
        .field {{ 
            margin: 8px 0; 
            display: flex;
            align-items: flex-start;
        }}
        .label {{ 
            font-weight: bold; 
            color: #555; 
            min-width: 140px;
            flex-shrink: 0;
        }}
        .value {{
            flex-grow: 1;
            margin-left: 10px;
        }}
        .sub-field {{
            margin-left: 20px;
            margin-top: 5px;
        }}
        .footer {{ 
            text-align: center; 
            border-top: 1px solid #ccc; 
            padding-top: 20px; 
            margin-top: 40px; 
            font-size: 10px; 
            color: #666; 
            page-break-inside: avoid;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }}
        th {{
            background-color: #f8f9fa;
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{header.get('title', 'DOCUMENT')}</h1>
        <p>{header.get('description', '')}</p>
        <p>Generated on: {header.get('generated_date', '')} at {header.get('generated_time', '')}</p>
    </div>
    
    <div class="section">
        <div class="section-title">FARMER INFORMATION</div>
        <div class="field">
            <span class="label">Name:</span>
            <span class="value">{farmer_info.get('name', '')}</span>
        </div>
        <div class="field">
            <span class="label">Aadhaar Number:</span>
            <span class="value">{farmer_info.get('aadhaar_number', '')}</span>
        </div>
        <div class="field">
            <span class="label">Contact Number:</span>
            <span class="value">{farmer_info.get('contact_number', '')}</span>
        </div>
        <div class="field">
            <span class="label">Address:</span>
            <span class="value">{farmer_info.get('address', '')}</span>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">APPLICATION DETAILS</div>
"""
        
        # Add document data fields with better formatting
        for key, value in document_data.items():
            if isinstance(value, dict):
                html_content += f'        <div class="field"><span class="label">{key.replace("_", " ").title()}:</span></div>\n'
                for sub_key, sub_value in value.items():
                    html_content += f'        <div class="sub-field"><span class="label">{sub_key.replace("_", " ").title()}:</span> <span class="value">{sub_value}</span></div>\n'
            else:
                html_content += f'        <div class="field"><span class="label">{key.replace("_", " ").title()}:</span> <span class="value">{value}</span></div>\n'
        
        html_content += f"""
    </div>
"""
        
        # 🤖 Add AI Assistance section if available
        if "ai_assistance" in content:
            ai_data = content["ai_assistance"]
            html_content += f"""
    <div class="section">
        <div class="section-title">🤖 AI ASSISTANCE</div>
        <div class="field">
            <span class="label">Your Question:</span>
            <span class="value">{ai_data.get('user_question', '')}</span>
        </div>
        <div class="field" style="margin-top: 15px;">
            <span class="label">AI Response:</span>
        </div>
        <div style="margin-left: 20px; margin-top: 10px; padding: 15px; background-color: #f0f8f0; border-left: 4px solid #68d391; border-radius: 4px;">
            <p style="margin: 0; line-height: 1.6;">{ai_data.get('ai_response', '')}</p>
        </div>
"""
            
            schemes = ai_data.get('relevant_schemes', [])
            if schemes:
                html_content += f"""
        <div class="field" style="margin-top: 15px;">
            <span class="label">Relevant Government Schemes:</span>
        </div>
        <ul style="margin-left: 20px; color: #2b6cb0;">
"""
                for scheme in schemes:
                    html_content += f"            <li>{scheme}</li>\n"
                
                html_content += "        </ul>\n"
            
            html_content += f"""
        <div style="margin-top: 15px; padding: 10px; background-color: #f7fafc; border-radius: 4px; font-size: 11px; color: #666;">
            <strong>Consultation Details:</strong> {ai_data.get('consultation_date', '')} at {ai_data.get('consultation_time', '')} | 
            <strong>AI Model:</strong> {ai_data.get('ai_model', '')}
        </div>
    </div>
"""
        
        # 💬 Add AI Chat Session section if available
        if "ai_chat_session" in content:
            chat_data = content["ai_chat_session"]
            html_content += f"""
    <div class="section">
        <div class="section-title">💬 AI CHAT SESSION SUMMARY</div>
        <div class="field">
            <span class="label">Total Questions:</span>
            <span class="value">{chat_data.get('total_questions', 0)}</span>
        </div>
        <div class="field">
            <span class="label">Session:</span>
            <span class="value">{chat_data.get('session_date', '')} at {chat_data.get('session_time', '')}</span>
        </div>
        <div style="margin-top: 20px;">
"""
            
            conversations = chat_data.get('conversation_summary', [])
            for i, conv in enumerate(conversations, 1):
                html_content += f"""
            <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
                <div style="font-weight: bold; color: #c53030; margin-bottom: 8px;">Q{i}: {conv.get('question', '')}</div>
                <div style="margin-bottom: 10px; padding-left: 15px;">{conv.get('ai_response', '')}</div>
"""
                schemes = conv.get('relevant_schemes', [])
                if schemes:
                    html_content += f"                <div style='font-size: 11px; color: #2b6cb0;'><strong>Related Schemes:</strong> {', '.join(schemes)}</div>\n"
                
                html_content += "            </div>\n"
            
            note = chat_data.get('note', '')
            if note:
                html_content += f"""
        </div>
        <div style="text-align: center; margin-top: 15px; font-size: 11px; color: #666; font-style: italic;">
            {note}
        </div>
    </div>
"""
            else:
                html_content += "        </div>\n    </div>\n"
        
        html_content += f"""
    <div class="footer">
        <p><strong>Generated by:</strong> {footer.get('generated_by', '')}</p>
        <p><em>{footer.get('disclaimer', '')}</em></p>
    </div>
</body>
</html>
"""
        
        return html_content

    def get_template_info(self, document_type: str) -> Optional[Dict[str, Any]]:
        """Get template information for a document type"""
        return self.config.DOCUMENT_TEMPLATES.get(document_type)

    def list_available_templates(self) -> Dict[str, Any]:
        """List all available document templates"""
        return {
            "templates": self.config.DOCUMENT_TEMPLATES,
            "count": len(self.config.DOCUMENT_TEMPLATES)
        }

# Global document generation service instance
document_service = DocumentGenerationService()
