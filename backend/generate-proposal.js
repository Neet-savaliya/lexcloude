const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ShadingType,
  Header, Footer, PageNumber, UnderlineType, TabStopPosition,
  TabStopType, convertInchesToTwip
} = require("docx");
const fs = require("fs");
const path = require("path");

// ─── PALETTE ────────────────────────────────────────────────────────────────
const NAVY  = "1F3864";
const MID   = "2E74B5";
const WHITE = "FFFFFF";
const BLACK = "000000";
const LGREY = "F2F2F2";
const MGREY = "D6DCE4";

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Dark navy banner exactly like reference PDF section headers */
function sectionBanner(num, title) {
  return new Paragraph({
    children: [new TextRun({ text: `${num}.   ${title}`, bold: true, size: 22, color: WHITE, font: "Arial" })],
    shading: { type: ShadingType.SOLID, color: NAVY },
    spacing: { before: 280, after: 160 },
    indent: { left: 100 },
  });
}

/** Bold underlined sub-heading (2.1 style) */
function subHeading(num, title) {
  return new Paragraph({
    children: [new TextRun({ text: `${num}  ${title}`, bold: true, size: 22, font: "Arial",
      underline: { type: UnderlineType.SINGLE } })],
    spacing: { before: 200, after: 80 },
  });
}

/** Justified body paragraph */
function body(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: "Times New Roman" })],
    spacing: { after: 140 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

/** Bullet point */
function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: "Times New Roman" })],
    bullet: { level: 0 },
    spacing: { after: 80 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

/** Numbered objective */
function numbered(n, text) {
  return new Paragraph({
    children: [
      new TextRun({ text: `O${n}.  `, bold: true, size: 22, font: "Arial" }),
      new TextRun({ text, size: 22, font: "Times New Roman" }),
    ],
    spacing: { after: 100 },
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 200 },
  });
}

/** Thin horizontal rule */
function rule() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY } },
    spacing: { after: 160 },
  });
}

function gap(n = 160) {
  return new Paragraph({ spacing: { after: n } });
}

function centred(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Arial", ...opts })],
    alignment: AlignmentType.CENTER,
    spacing: { after: opts.after || 80 },
  });
}

// ─── COVER TABLE ─────────────────────────────────────────────────────────────
function coverRow(label, value) {
  return new TableRow({ children: [
    new TableCell({
      width: { size: 32, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.SOLID, color: LGREY },
      children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: "Arial" })] })],
    }),
    new TableCell({
      width: { size: 68, type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: "Times New Roman" })] })],
    }),
  ]});
}

// ─── GANTT TABLE ─────────────────────────────────────────────────────────────
const ganttData = [
  { task: "Literature Review & System Design",        weeks: [1,1,0,0,0,0,0,0,0,0,0,0] },
  { task: "AWS Infrastructure Setup",                 weeks: [0,1,1,0,0,0,0,0,0,0,0,0] },
  { task: "Backend RAG Pipeline Development",         weeks: [0,0,1,1,0,0,0,0,0,0,0,0] },
  { task: "Frontend Web Application",                 weeks: [0,0,0,1,1,0,0,0,0,0,0,0] },
  { task: "System Integration & Testing",             weeks: [0,0,0,0,1,1,0,0,0,0,0,0] },
  { task: "Evaluation (IndianBailJudgments-1200)",    weeks: [0,0,0,0,0,1,1,0,0,0,0,0] },
  { task: "Critical Analysis & Dissertation Writing", weeks: [0,0,0,0,0,1,1,1,1,0,0,0] },
  { task: "Supervisor Review & Revisions",            weeks: [0,0,0,0,0,0,0,0,1,1,0,0] },
  { task: "Final Submission Preparation",             weeks: [0,0,0,0,0,0,0,0,0,1,1,1] },
];

const weeks = ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"];
const colW = [3200, ...Array(12).fill(600)];

function ganttTable() {
  const headerRow = new TableRow({ tableHeader: true, children: [
    new TableCell({
      width: { size: colW[0], type: WidthType.DXA },
      shading: { type: ShadingType.SOLID, color: NAVY },
      children: [new Paragraph({ children: [new TextRun({ text: "Task / Activity", bold: true, color: WHITE, size: 18, font: "Arial" })], alignment: AlignmentType.LEFT })],
    }),
    ...weeks.map((w, i) => new TableCell({
      width: { size: colW[i+1], type: WidthType.DXA },
      shading: { type: ShadingType.SOLID, color: NAVY },
      children: [new Paragraph({ children: [new TextRun({ text: w, bold: true, color: WHITE, size: 18, font: "Arial" })], alignment: AlignmentType.CENTER })],
    })),
  ]});

  const dataRows = ganttData.map((row, ri) =>
    new TableRow({ children: [
      new TableCell({
        width: { size: colW[0], type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? LGREY : WHITE },
        children: [new Paragraph({ children: [new TextRun({ text: row.task, size: 18, font: "Arial" })] })],
      }),
      ...row.weeks.map((active, wi) => new TableCell({
        width: { size: colW[wi+1], type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: active ? MID : (ri % 2 === 0 ? LGREY : WHITE) },
        children: [new Paragraph({ children: [new TextRun({ text: " ", size: 18 })], alignment: AlignmentType.CENTER })],
      })),
    ]})
  );

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] });
}

// ─── MILESTONE TABLE ─────────────────────────────────────────────────────────
const milestones = [
  { id: "M1", milestone: "Dissertation Proposal Submission",               date: "24 June 2026" },
  { id: "M2", milestone: "Literature Review & Research Gap Confirmed",      date: "11 July 2026" },
  { id: "M3", milestone: "AWS Infrastructure & RAG Pipeline Complete",     date: "1 August 2026" },
  { id: "M4", milestone: "Frontend & System Integration Complete",          date: "15 August 2026" },
  { id: "M5", milestone: "Full Dissertation Draft to Supervisor",           date: "22 August 2026" },
  { id: "M6", milestone: "Final Dissertation Submission (Turnitin)",        date: "1 September 2026" },
];

function milestoneTable() {
  const hRow = new TableRow({ tableHeader: true, children: [
    new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: NAVY },
      children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true, color: WHITE, size: 20, font: "Arial" })], alignment: AlignmentType.CENTER })] }),
    new TableCell({ width: { size: 62, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: NAVY },
      children: [new Paragraph({ children: [new TextRun({ text: "Milestone", bold: true, color: WHITE, size: 20, font: "Arial" })] })] }),
    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: NAVY },
      children: [new Paragraph({ children: [new TextRun({ text: "Target Date", bold: true, color: WHITE, size: 20, font: "Arial" })], alignment: AlignmentType.CENTER })] }),
  ]});

  const rows = milestones.map((m, i) => new TableRow({ children: [
    new TableCell({ shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? LGREY : WHITE },
      children: [new Paragraph({ children: [new TextRun({ text: m.id, bold: true, size: 20, font: "Arial" })], alignment: AlignmentType.CENTER })] }),
    new TableCell({ shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? LGREY : WHITE },
      children: [new Paragraph({ children: [new TextRun({ text: m.milestone, size: 20, font: "Times New Roman" })] })] }),
    new TableCell({ shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? LGREY : WHITE },
      children: [new Paragraph({ children: [new TextRun({ text: m.date, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER })] }),
  ]}));

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hRow, ...rows] });
}

// ─── REFERENCE LIST ───────────────────────────────────────────────────────────
const references = [
  "Baldini, I., Castro, P., Chang, K., Cheng, P., Fink, S., Ishakian, V., Mitchell, N., Muthusamy, V., Rabbah, R., Slominski, A. and Suter, P. (2017) 'Serverless computing: Current trends and open problems', in Chaudhary, S., Somani, G. and Buyya, R. (eds.) Research Advances in Cloud Computing. Singapore: Springer, pp. 1–20.",
  "CaseMine (2024) CaseMine — AI-based legal research. Available at: https://www.casemine.com (Accessed: 18 June 2026).",
  "Chalkidis, I., Fergadiotis, M., Malakasiotis, P., Aletras, N. and Androutsopoulos, I. (2020) 'LEGAL-BERT: The muppets straight out of law school', Findings of the Association for Computational Linguistics: EMNLP 2020, pp. 2898–2904.",
  "Gao, Y., Xiong, Y., Gao, X., Jia, K., Pan, J., Bi, Y., Dai, Y., Sun, J. and Wang, H. (2023) 'Retrieval-augmented generation for large language models: A survey', arXiv preprint arXiv:2312.10997.",
  "Grand View Research (2023) Legal AI Market Size, Share & Trends Analysis Report, 2024–2030. San Francisco: Grand View Research.",
  "Harvey AI (2024) Harvey — AI for the legal profession. Available at: https://www.harvey.ai (Accessed: 18 June 2026).",
  "Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S. and Kiela, D. (2020) 'Retrieval-augmented generation for knowledge-intensive NLP tasks', Advances in Neural Information Processing Systems, 33, pp. 9459–9474.",
  "Malik, V., Sanjay, H.S., Nigam, S.K., Ghosh, A., Bhatt, S., Teja, R.L., Wakode, S.V. and Modi, P. (2021) 'IndianBailJudgments: A benchmark dataset of Indian bail judgments', arXiv preprint arXiv:2105.04150.",
  "Manupatra (2024) Manupatra — Legal Research and Information. Available at: https://www.manupatra.com (Accessed: 18 June 2026).",
  "Ministry of Electronics and Information Technology (2023) The Digital Personal Data Protection Act, 2023. New Delhi: Government of India. Available at: https://www.meity.gov.in (Accessed: 18 June 2026).",
];

// ─── BUILD DOCUMENT ──────────────────────────────────────────────────────────
const RUNNING_HEADER = "Neet Savaliya  |  3040040  |  CN7000 Dissertation Proposal  |  UEL 2025/26";

const doc = new Document({
  styles: {
    paragraphStyles: [
      { id: "Normal", name: "Normal", run: { font: "Times New Roman", size: 22 } },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 900, bottom: 900, left: 1080, right: 1080 } } },

    headers: {
      default: new Header({ children: [
        new Paragraph({
          children: [new TextRun({ text: RUNNING_HEADER, size: 16, color: "555555", font: "Arial" })],
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" } },
          spacing: { after: 80 },
        }),
      ]}),
    },

    footers: {
      default: new Footer({ children: [
        new Paragraph({
          children: [
            new TextRun({ text: "Page ", size: 16, color: "555555", font: "Arial" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "555555", font: "Arial" }),
            new TextRun({ text: "  |  University of East London  |  MSc Cloud Computing", size: 16, color: "555555", font: "Arial" }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" } },
          spacing: { before: 80 },
        }),
      ]}),
    },

    children: [

      // ══════════════════════════════════════════════════════════════
      // COVER PAGE
      // ══════════════════════════════════════════════════════════════
      gap(400),
      centred("UNIVERSITY OF EAST LONDON", { bold: true, size: 32, after: 60 }),
      centred("School of Architecture, Computing and Engineering", { size: 20, color: "444444", after: 40 }),
      centred("MSc Cloud Computing", { size: 20, italics: true, color: "444444", after: 200 }),
      rule(),
      gap(200),
      centred("DISSERTATION PROPOSAL", { bold: true, size: 48, after: 80 }),
      centred("CN7000 — MSc Dissertation  |  Academic Year 2025/26", { size: 20, color: "444444", after: 200 }),
      rule(),
      gap(200),

      // Title block
      centred("A Data-Sovereign, Cloud-Native Legal Document Intelligence", { bold: true, size: 36, after: 60 }),
      centred("System for Indian Law Firms using AWS Serverless", { bold: true, size: 36, after: 60 }),
      centred("Architecture and Retrieval-Augmented Generation", { bold: true, size: 36, after: 320 }),

      // Details table
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          coverRow("Programme",     "MSc Cloud Computing"),
          coverRow("Student Name",  "Neet Savaliya"),
          coverRow("Student ID",    "3040040"),
          coverRow("Module Code",   "CN7000"),
          coverRow("Year / Term",   "2025–2026  |  Term 3"),
          coverRow("Module Leader", "Dr Saeed Sharif"),
          coverRow("Supervisor",    "Rasha Hafidh"),
        ],
      }),
      gap(120),
      centred("University of East London  |  London, United Kingdom", { size: 18, italics: true, color: "666666", after: 0 }),

      // ══════════════════════════════════════════════════════════════
      // SECTION 1 — PROJECT SUMMARY
      // ══════════════════════════════════════════════════════════════
      gap(240),
      sectionBanner("1", "Project Summary"),

      body("LexCloud is a cloud-native, serverless legal document intelligence platform designed for Indian law firms. The system enables legal practitioners to securely upload, store, and semantically interrogate private case documents using artificial intelligence, entirely within the AWS Mumbai Region (ap-south-1), ensuring full data sovereignty in compliance with India's Digital Personal Data Protection (DPDP) Act 2023."),
      body("The core architecture employs a Retrieval-Augmented Generation (RAG) pipeline in which uploaded documents are processed through Optical Character Recognition via AWS Textract, converted into semantic vector embeddings using Amazon Titan Embeddings, and made queryable through AWS Bedrock with Claude Haiku as the inference model. Unlike existing platforms such as CaseMine and Manupatra, which index only publicly available court judgments, LexCloud enables firms to query their own private case files and receive AI-generated, source-cited responses."),
      body("The system targets small and mid-sized Indian law firms that currently lack access to compliant, affordable private document intelligence. All source code will be submitted as dissertation appendices and published to a public GitHub repository. The project adopts the 50% practical marking scheme in recognition of the emphasis placed on a fully deployed, empirically evaluated system."),

      // ══════════════════════════════════════════════════════════════
      // SECTION 2 — AIM AND OBJECTIVES
      // ══════════════════════════════════════════════════════════════
      sectionBanner("2", "Aim and Objectives"),

      subHeading("2.1", "Research Aim"),
      body("The primary aim of this research is to design, develop, and evaluate a cloud-native, data-sovereign legal document intelligence platform that enables Indian law firms to semantically query their private case documents using a Retrieval-Augmented Generation pipeline, deployed entirely on AWS serverless infrastructure within the Mumbai Region (ap-south-1) in compliance with India's DPDP Act 2023."),

      subHeading("2.2", "Research Objectives"),
      numbered(1, "To conduct a systematic review of existing LegalTech platforms and identify the functional and regulatory compliance gaps that prevent their adoption by Indian law firms."),
      numbered(2, "To design a serverless AWS architecture for secure, scalable document ingestion, OCR-based text extraction, and semantic vector embedding, with all processing and storage confined to ap-south-1."),
      numbered(3, "To implement a Retrieval-Augmented Generation pipeline using Amazon Titan Embeddings and AWS Bedrock (Claude Haiku) capable of producing accurate, source-cited natural language responses to legal queries."),
      numbered(4, "To develop a React-based web application providing an authenticated, case-centric interface for document management and AI-powered querying, accessible to non-technical legal practitioners."),
      numbered(5, "To evaluate system performance using the IndianBailJudgments-1200 dataset against defined quantitative metrics: query response time under three seconds, retrieval precision above 80%, and source attribution accuracy above 90%."),
      numbered(6, "To demonstrate end-to-end DPDP Act 2023 compliance by verifying that all data storage and processing operations remain within the AWS ap-south-1 region throughout the system lifecycle."),
      gap(80),

      // ══════════════════════════════════════════════════════════════
      // SECTION 3 — RESEARCH AREA
      // ══════════════════════════════════════════════════════════════
      sectionBanner("3", "Research Area — Brief Literature Review"),

      subHeading("3.1", "The Indian Legal Technology Landscape"),
      body("The global legal technology sector has experienced substantial growth over the past decade, driven by advances in Natural Language Processing (NLP) and the widespread availability of managed cloud infrastructure. The global legal AI market was valued at approximately USD 1.2 billion in 2023 and is projected to expand to USD 37 billion by 2030 (Grand View Research, 2023). Despite this global momentum, adoption of AI-driven document intelligence within Indian law firms remains disproportionately low, attributable to data sovereignty regulations, prohibitive enterprise pricing, and the absence of India-specific, compliant solutions."),
      body("The dominant technology providers in the Indian legal market are CaseMine, Manupatra, and SCC Online. CaseMine applies AI-driven citation analysis and natural language search across publicly available Indian court judgments (CaseMine, 2024). Manupatra offers a subscription database encompassing statutes, case law, and regulatory materials (Manupatra, 2024). SCC Online, published by Eastern Book Company, is the reference platform used by the Supreme Court and High Courts of India. A critical limitation shared by all three platforms is that they exclusively index publicly available judicial data; none provide any mechanism for law firms to upload, store, or interrogate their own private case documents."),

      subHeading("3.2", "Retrieval-Augmented Generation in Legal Document Systems"),
      body("Retrieval-Augmented Generation (RAG) has emerged as the dominant architectural pattern for enterprise document querying. First formalised by Lewis et al. (2020), RAG combines dense vector retrieval with generative language models to produce contextually grounded, factually accurate responses. Unlike purely generative models, RAG systems ground their outputs in retrieved source documents, significantly reducing hallucination rates — a characteristic essential for high-stakes legal applications where factual accuracy and source attribution are non-negotiable (Gao et al., 2023)."),
      body("Vector embeddings, in which documents and queries are mapped into a shared high-dimensional semantic space, enable similarity-based retrieval that substantially outperforms traditional keyword search on legal language (Chalkidis et al., 2020). Amazon Titan Embeddings, available through AWS Bedrock, provides a fully managed embedding service suitable for production deployment without infrastructure overhead."),

      subHeading("3.3", "Global LegalTech Platforms and the India Compliance Gap"),
      body("Internationally, Harvey AI represents the most commercially advanced application of generative AI to legal document work, having attracted over USD 3 billion in investment and serving major firms including Allen & Overy and PwC Legal (Harvey AI, 2024). However, Harvey AI operates exclusively from data centres in the United States and Europe, making it non-compliant with India's Digital Personal Data Protection Act 2023 (Ministry of Electronics and Information Technology, 2023). This Act mandates that personal data processed by entities operating in India must not be transferred to foreign territories without explicit consent and adequate protections. The same compliance barrier applies to Microsoft Copilot for Legal and Thomson Reuters CoCounsel, neither of which operates an India-resident data centre."),

      subHeading("3.4", "Serverless Architecture for Cloud-Native Legal Systems"),
      body("AWS's Mumbai Region (ap-south-1), operational since 2016, provides a compliance-ready serverless infrastructure within Indian territory. Research by Baldini et al. (2017) demonstrates that AWS Lambda-based serverless architectures achieve elastic scalability at substantially lower operational cost than equivalent server-based deployments. This characteristic is particularly valuable for small Indian law firms operating under constrained IT budgets. By building on S3, Lambda, API Gateway, DynamoDB, Textract, Bedrock, and Cognito — all available in ap-south-1 — LexCloud achieves both cost efficiency and regulatory compliance simultaneously."),

      subHeading("3.5", "Research Gap and Original Contribution"),
      body("The research gap identified through this review is unambiguous: no existing platform combines RAG-based private document querying with India-resident cloud infrastructure at a cost accessible to small and mid-sized law firms. This dissertation addresses that gap by delivering (1) an original, fully deployed serverless system architecture; (2) empirical evaluation against a publicly available Indian legal dataset; and (3) a critically analysed compliance framework demonstrating DPDP Act 2023 adherence — contributing to both the academic LegalTech literature and practical industry application."),

      // ══════════════════════════════════════════════════════════════
      // SECTION 4 — PRACTICAL OUTPUT
      // ══════════════════════════════════════════════════════════════
      sectionBanner("4", "Expected Practical Element Output"),

      body("The primary deliverable is a fully functional, cloud-deployed web application comprising three integrated components:"),

      subHeading("4.1", "Serverless Document Ingestion Pipeline"),
      body("A serverless pipeline accepting PDF and DOCX uploads from authenticated users. Documents are stored in an Amazon S3 bucket (ap-south-1), processed through AWS Textract for OCR-based text extraction, and converted into semantic vector embeddings via Amazon Titan Embeddings through AWS Bedrock. Embedding vectors and document metadata are persisted in Amazon DynamoDB to enable retrieval. Authentication is managed via Amazon Cognito, with all API traffic routed through Amazon API Gateway to AWS Lambda handler functions."),

      subHeading("4.2", "AI Query Interface — RAG Pipeline"),
      body("A natural language query interface enabling users to ask questions across their uploaded documents. Each query is converted to an embedding, compared against stored vectors using cosine similarity, and the top-ranked document passages are retrieved and passed to Claude Haiku via AWS Bedrock to generate a contextually grounded, source-cited response. The pipeline operates entirely within ap-south-1 with no data leaving Indian territory."),

      subHeading("4.3", "React Web Application and Evaluation"),
      body("A React-based single-page application providing a case management dashboard where users can create cases, upload documents, and submit natural language queries. System performance will be evaluated using the IndianBailJudgments-1200 open dataset (Malik et al., 2021). Target metrics include query response time under three seconds, retrieval precision above 80%, and correct source attribution in over 90% of test queries. All source code will be submitted as dissertation appendices and published to GitHub."),

      // ══════════════════════════════════════════════════════════════
      // SECTION 5 — RESOURCES
      // ══════════════════════════════════════════════════════════════
      sectionBanner("5", "Required Resources"),

      subHeading("5.1", "Cloud Infrastructure"),
      body("An active AWS account with access to the ap-south-1 Mumbai Region. Services required include Amazon S3, AWS Lambda, Amazon API Gateway, Amazon DynamoDB, AWS Textract, AWS Bedrock (Amazon Titan Embeddings and Anthropic Claude Haiku models), and Amazon Cognito. The estimated total cloud cost across the development period is approximately £15–20 — well within standard academic research budgets and requiring no institutional funding."),

      subHeading("5.2", "Development Environment and Libraries"),
      body("A Windows 11 personal workstation with Node.js v20 LTS, the AWS CLI v2, and Git for version control. Backend Lambda functions are developed in JavaScript (Node.js) using AWS SDK v3. The frontend is built with React.js. Additional open-source libraries include docx (Word document generation) and pptxgenjs. All tools carry no licensing cost."),

      subHeading("5.3", "Dataset"),
      body("The IndianBailJudgments-1200 dataset, publicly available on Hugging Face under an open academic licence, will be used for system evaluation. It contains 1,200 annotated Indian bail judgment documents and requires no data access agreement or institutional approval."),

      // ══════════════════════════════════════════════════════════════
      // SECTION 6 — PREREQUISITES
      // ══════════════════════════════════════════════════════════════
      sectionBanner("6", "Prerequisite Knowledge and Skills Required"),

      subHeading("6.1", "Cloud Architecture"),
      body("A working understanding of core AWS services — S3, Lambda, API Gateway, DynamoDB, and IAM — including serverless design patterns, event-driven architecture principles, and AWS security best practices. Familiarity with IAM least-privilege policies and S3 bucket permission models is directly applicable to this project."),

      subHeading("6.2", "Software Development"),
      body("Proficiency in JavaScript and Node.js for AWS Lambda function development, and working knowledge of React.js for frontend development. Understanding of REST API design and asynchronous programming patterns in Node.js is required for the API Gateway integration layer."),

      subHeading("6.3", "Artificial Intelligence and NLP"),
      body("A foundational understanding of Natural Language Processing concepts — specifically vector embeddings, semantic similarity, and the RAG architectural pattern — is necessary to implement and critically evaluate the document query pipeline. An awareness of how large language models process prompts and generate outputs is required to design effective query templates for AWS Bedrock."),

      subHeading("6.4", "Regulatory and Academic Knowledge"),
      body("Familiarity with India's DPDP Act 2023 and its implications for cloud data storage is central to the project's design rationale. Academic skills — including structured literature review, quantitative performance evaluation, and Harvard referencing — are applied throughout the dissertation. No advanced machine learning theory is required, as the project makes exclusive use of fully managed AI services through AWS Bedrock."),

      // ══════════════════════════════════════════════════════════════
      // SECTION 7 — PROJECT PLAN
      // ══════════════════════════════════════════════════════════════
      sectionBanner("7", "Project Plan — Gantt Chart"),

      body("The Gantt chart below maps all key development and academic activities across the 12-week dissertation period (June to September 2026). Blue-shaded cells indicate active work weeks for each task."),
      gap(120),
      ganttTable(),
      gap(240),

      new Paragraph({
        children: [new TextRun({ text: "Key Project Milestones", bold: true, size: 22, font: "Arial" })],
        spacing: { after: 120 },
      }),
      milestoneTable(),
      gap(240),

      // ══════════════════════════════════════════════════════════════
      // REFERENCES
      // ══════════════════════════════════════════════════════════════
      new Paragraph({
        children: [new TextRun({ text: "References", bold: true, size: 22, color: WHITE, font: "Arial" })],
        shading: { type: ShadingType.SOLID, color: NAVY },
        spacing: { before: 280, after: 160 },
        indent: { left: 100 },
      }),

      ...references.map(ref => new Paragraph({
        children: [new TextRun({ text: ref, size: 20, font: "Times New Roman", italics: true })],
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 360, hanging: 360 },
      })),

      gap(120),
      new Paragraph({
        children: [new TextRun({ text: "Neet Savaliya  |  3040040  |  MSc Cloud Computing  |  University of East London  |  2025/26", size: 16, color: "666666", font: "Arial" })],
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" } },
        spacing: { before: 80 },
      }),
    ],
  }],
});

// ─── WRITE FILE ──────────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, "..", "..", "..", "LexCloud_Dissertation_Proposal.docx");

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Done:", outPath);
}).catch(err => console.error(err.message));
