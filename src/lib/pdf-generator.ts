import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import { Response, Analytics, CallData } from "@/types/response";
import { Interview } from "@/types/interview";

// Helper function to add header to PDF
const addHeader = (doc: jsPDF, title: string, interviewName?: string) => {
  doc.setFillColor(249, 115, 22); // Orange color (orange-500)
  doc.rect(0, 0, doc.internal.pageSize.width, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, 25);
  
  if (interviewName) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Interview: ${interviewName}`, 20, 35);
  }
  
  doc.setTextColor(0, 0, 0);
};

// Helper function to draw circular progress chart
const drawCircularProgress = (
  doc: jsPDF,
  x: number,
  y: number,
  radius: number,
  value: number,
  maxValue: number,
  label: string
) => {
  const centerX = x + radius;
  const centerY = y + radius;
  const percentage = (value / maxValue) * 100;
  const angle = (percentage / 100) * 360;
  
  // Draw background circle (light gray)
  doc.setDrawColor(229, 231, 235); // gray-200
  doc.setLineWidth(3);
  doc.circle(centerX, centerY, radius, "S");
  
  // Draw progress arc (orange)
  if (percentage > 0) {
    doc.setDrawColor(249, 115, 22); // orange-500
    doc.setLineWidth(3);
    
    // Convert angle to radians and draw arc
    const startAngle = -90; // Start from top
    const endAngle = startAngle + angle;
    
    // Draw the arc in segments for better rendering
    const segments = Math.ceil(angle / 5);
    for (let i = 0; i <= segments; i++) {
      const currentAngle = startAngle + (angle * i / segments);
      const nextAngle = startAngle + (angle * (i + 1) / segments);
      
      const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
      const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180);
      const x2 = centerX + radius * Math.cos((nextAngle * Math.PI) / 180);
      const y2 = centerY + radius * Math.sin((nextAngle * Math.PI) / 180);
      
      if (i < segments) {
        doc.line(x1, y1, x2, y2);
      }
    }
  }
  
  // Draw value in center
  doc.setTextColor(249, 115, 22); // orange-500
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const valueText = maxValue === 100 ? value.toString() : `${value}/${maxValue}`;
  const textWidth = doc.getTextWidth(valueText);
  doc.text(valueText, centerX - textWidth / 2, centerY + 2);
  
  // Draw label below circle
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const labelWidth = doc.getTextWidth(label);
  doc.text(label, centerX - labelWidth / 2, centerY + radius + 8);
};

// Helper function to add footer to PDF
const addFooter = (doc: jsPDF, pageNumber: number) => {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Page ${pageNumber} | Generated on ${new Date().toLocaleDateString()}`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: "center" }
  );
};

// Helper function to safely add text with word wrapping
const addWrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 7
): number => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

// Generate individual candidate PDF report (optimized for single page)
export const generateIndividualCandidatePDF = async (
  candidateName: string,
  candidateEmail: string,
  analytics: Analytics | null,
  callData: CallData | null,
  interviewName: string,
  recordingUrl?: string,
  transcriptUrl?: string
) => {
  const doc = new jsPDF();
  let yPosition = 50;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Add header
  addHeader(doc, "Candidate Report", interviewName);

  // Candidate Information Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Candidate Information", margin, yPosition);
  yPosition += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${candidateName || "Anonymous"}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Email: ${candidateEmail || "Not provided"}`, margin, yPosition);
  yPosition += 5;

  // Recording and Transcript Links (inline)
  if (recordingUrl || transcriptUrl) {
    let linksText = "";
    if (recordingUrl && transcriptUrl) {
      linksText = "Resources: ";
    }
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    if (recordingUrl) {
      doc.text(linksText, margin, yPosition);
      const linkXPos = margin + doc.getTextWidth(linksText);
      doc.textWithLink("Listen to Recording", linkXPos, yPosition, { url: recordingUrl });
      
      if (transcriptUrl) {
        const divider = " | ";
        const dividerXPos = linkXPos + doc.getTextWidth("Listen to Recording");
        doc.text(divider, dividerXPos, yPosition);
        const transcriptXPos = dividerXPos + doc.getTextWidth(divider);
        doc.textWithLink("Download Transcript", transcriptXPos, yPosition, { url: transcriptUrl });
      }
      yPosition += 5;
    } else if (transcriptUrl) {
      doc.text("Resources: ", margin, yPosition);
      doc.textWithLink("Download Transcript", margin + doc.getTextWidth("Resources: "), yPosition, { url: transcriptUrl });
      yPosition += 5;
    }
  }
  
  yPosition += 5;

  // General Summary Section
  if (analytics) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("General Summary", margin, yPosition);
    yPosition += 8;

    // Draw circular progress charts side by side
    const chartRadius = 12;
    const chartSpacing = 50;
    const chartStartX = margin + 5;
    
    if (analytics.overallScore !== undefined) {
      drawCircularProgress(doc, chartStartX, yPosition, chartRadius, analytics.overallScore, 100, "Overall Hiring Score");
    }
    
    if (analytics.communication?.score !== undefined) {
      drawCircularProgress(doc, chartStartX + chartSpacing, yPosition, chartRadius, analytics.communication.score, 10, "Communication");
    }
    
    yPosition += chartRadius * 2 + 16;

    // Overall Summary feedback
    if (analytics.overallFeedback) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Feedback: ", margin, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition = addWrappedText(doc, analytics.overallFeedback, margin, yPosition + 4, contentWidth, 4);
      yPosition += 5;
    }

    // Communication feedback
    if (analytics.communication?.feedback) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Communication: ", margin, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition = addWrappedText(doc, analytics.communication.feedback, margin, yPosition + 4, contentWidth, 4);
      yPosition += 5;
    }

    // User Sentiment from call analysis
    if (callData?.call_analysis?.user_sentiment) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`User Sentiment: ${callData.call_analysis.user_sentiment}`, margin, yPosition);
      yPosition += 5;
    }
    
    // Call Summary
    if (callData?.call_analysis?.call_summary) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Call Summary: ", margin, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition = addWrappedText(doc, callData.call_analysis.call_summary, margin, yPosition + 4, contentWidth, 4);
      yPosition += 8;
    }

    // Question Summaries (compact)
    if (analytics.questionSummaries && analytics.questionSummaries.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Question Analysis", margin, yPosition);
      yPosition += 6;

      analytics.questionSummaries.forEach((qs, index) => {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        const questionText = doc.splitTextToSize(`Q${index + 1}: ${qs.question}`, contentWidth);
        doc.text(questionText, margin, yPosition);
        yPosition += questionText.length * 3.5;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(doc, qs.summary, margin, yPosition, contentWidth, 3.5);
        yPosition += 4;
      });
    }
  }

  // Add footer
  addFooter(doc, 1);

  // Save the PDF
  doc.save(`${candidateName || "Candidate"}_Report.pdf`);
};

// Generate individual PDFs for all candidates and zip them
export const generateAllCandidatesPDF = async (
  responses: Response[],
  interview: Interview | undefined
) => {
  const zip = new JSZip();
  
  // Generate a separate PDF for each candidate and add to zip
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    
    // Create a new PDF document for this candidate
    const doc = new jsPDF();
    let yPosition = 50;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const candidateName = response.name || "Anonymous";
    const candidateEmail = response.email || "";
    const analytics = response.analytics || null;
    const callData = response.details || null;
    const interviewName = interview?.name || "Interview";
    const recordingUrl = response.details?.recording_url;
    const transcriptUrl = response.details?.public_log_url;

    // Add header
    addHeader(doc, "Candidate Report", interviewName);

    // Candidate Information Section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Candidate Information", margin, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${candidateName}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Email: ${candidateEmail || "Not provided"}`, margin, yPosition);
    yPosition += 5;

    // Recording and Transcript Links (inline)
    if (recordingUrl || transcriptUrl) {
      let linksText = "";
      if (recordingUrl && transcriptUrl) {
        linksText = "Resources: ";
      }
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      if (recordingUrl) {
        doc.text(linksText, margin, yPosition);
        const linkXPos = margin + doc.getTextWidth(linksText);
        doc.textWithLink("Listen to Recording", linkXPos, yPosition, { url: recordingUrl });
        
        if (transcriptUrl) {
          const divider = " | ";
          const dividerXPos = linkXPos + doc.getTextWidth("Listen to Recording");
          doc.text(divider, dividerXPos, yPosition);
          const transcriptXPos = dividerXPos + doc.getTextWidth(divider);
          doc.textWithLink("Download Transcript", transcriptXPos, yPosition, { url: transcriptUrl });
        }
        yPosition += 5;
      } else if (transcriptUrl) {
        doc.text("Resources: ", margin, yPosition);
        doc.textWithLink("Download Transcript", margin + doc.getTextWidth("Resources: "), yPosition, { url: transcriptUrl });
        yPosition += 5;
      }
    }
    
    yPosition += 5;

    // General Summary Section
    if (analytics) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("General Summary", margin, yPosition);
      yPosition += 8;

      // Draw circular progress charts side by side
      const chartRadius = 12;
      const chartSpacing = 50;
      const chartStartX = margin + 5;
      
      if (analytics.overallScore !== undefined) {
        drawCircularProgress(doc, chartStartX, yPosition, chartRadius, analytics.overallScore, 100, "Overall Hiring Score");
      }
      
      if (analytics.communication?.score !== undefined) {
        drawCircularProgress(doc, chartStartX + chartSpacing, yPosition, chartRadius, analytics.communication.score, 10, "Communication");
      }
      
      yPosition += chartRadius * 2 + 16;

      // Overall Summary feedback
      if (analytics.overallFeedback) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Feedback: ", margin, yPosition);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(doc, analytics.overallFeedback, margin, yPosition + 4, contentWidth, 4);
        yPosition += 5;
      }

      // Communication feedback
      if (analytics.communication?.feedback) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Communication: ", margin, yPosition);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(doc, analytics.communication.feedback, margin, yPosition + 4, contentWidth, 4);
        yPosition += 5;
      }

      // User Sentiment from call analysis
      if (callData?.call_analysis?.user_sentiment) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`User Sentiment: ${callData.call_analysis.user_sentiment}`, margin, yPosition);
        yPosition += 5;
      }
      
      // Call Summary
      if (callData?.call_analysis?.call_summary) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Call Summary: ", margin, yPosition);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(doc, callData.call_analysis.call_summary, margin, yPosition + 4, contentWidth, 4);
        yPosition += 8;
      }

      // Question Summaries (compact)
      if (analytics.questionSummaries && analytics.questionSummaries.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Question Analysis", margin, yPosition);
        yPosition += 6;

        analytics.questionSummaries.forEach((qs, index) => {
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          const questionText = doc.splitTextToSize(`Q${index + 1}: ${qs.question}`, contentWidth);
          doc.text(questionText, margin, yPosition);
          yPosition += questionText.length * 3.5;

          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          yPosition = addWrappedText(doc, qs.summary, margin, yPosition, contentWidth, 3.5);
          yPosition += 4;
        });
      }
    }

    // Add footer
    addFooter(doc, 1);

    // Get PDF as blob and add to zip
    const pdfBlob = doc.output("blob");
    const fileName = `${candidateName.replace(/[^a-z0-9]/gi, '_')}_Report.pdf`;
    zip.file(fileName, pdfBlob);
  }
  
  // Generate zip and download
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${interview?.name || "Interview"}_All_Candidates_Reports.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

