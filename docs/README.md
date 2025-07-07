# Data Analysis Platform

A modern data analysis platform using Next.js, AI SDK, PostgreSQL, and Drizzle ORM.

## 🚀 Key Features

### 📊 General Data Analysis
- **File Upload**: Support for CSV, Excel, JSON, TSV files
- **Statistical Analysis**: Descriptive statistics, correlation analysis, distribution analysis
- **Visualization**: Interactive charts and graphs
- **Data Cleaning**: Automatic data cleaning and preprocessing
- **Project Management**: Save and manage analysis projects

### 📋 Survey Analysis
- **Professional Survey Analysis**: Automatic parsing of Excel-based survey statistics tables
- **Question-by-Question Analysis**: Select and analyze individual questions
- **Statistical Testing**: Automatic F-test, t-test, Chi-square test execution
- **Result Visualization**: Generate charts and graphs for survey results

### 🤖 AI Table Analysis Agent
- **LangGraph Workflow**: AI-based automatic analysis pipeline
- **Multi-language Support**: Korean/English analysis support
- **Hallucination Verification**: Automatic verification of AI analysis results
- **Batch Analysis**: Batch analysis of multiple questions
- **Real-time Progress**: Display progress for each analysis step
- **Intelligent Statistical Testing**: Rule-based + LLM-based automatic test method determination

## 🏗️ LangGraph Implementation

This project has implemented LangGraph workflow in two ways:

### Method 1: Python Backend API (Recommended)
```bash
# Python Backend Execution
cd backend
pip install -r requirements.txt
python langgraph_api.py
```

**Features:**
- FastAPI-based REST API
- LangChain and OpenAI integration
- Asynchronous workflow execution
- File upload and processing

### Method 2: JavaScript Workflow Engine
```typescript
// lib/ai/workflowEngine.ts
const workflowEngine = new WorkflowEngine(openaiApiKey);
const result = await workflowEngine.executeWorkflow(initialState);
```

**Features:**
- Pure JavaScript implementation
- Direct execution in the browser
- Direct OpenAI API call
- Real-time progress tracking

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: Full-stack React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Modern UI components
- **React Dropzone**: File upload
- **Chart.js**: Data visualization

### Backend
- **FastAPI**: Python Backend API
- **LangChain**: Workflow management
- **OpenAI GPT-4**: AI analysis engine
- **PostgreSQL**: Database
- **Drizzle ORM**: Type-safe database ORM

### AI & Analysis
- **LangGraph**: AI workflow orchestration
- **XLSX**: Excel file processing
- **Pandas**: Data analysis and processing
- **Statistical Testing**: F-test, t-test, Chi-square test

## 📦 Installation and Execution

### 1. Dependency Installation
```bash
npm install
```

### 2. Environment Variable Setting
```bash
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/database"
OPENAI_API_KEY="your-openai-api-key"
```

### 3. Database Setting (Optional)
```bash
npm run db:generate
npm run db:push
```

### 4. Development Server Execution
```bash
npm run dev
```

### 5. Python Backend Execution (LangGraph API)
```bash
cd backend
pip install -r requirements.txt
python langgraph_api.py
```

## �� Usage

### General Data Analysis
1. Upload data file from `/upload` page
2. Select file format and analysis options
3. Run analysis and check results
4. Visualize and derive insights

### Survey Analysis
1. Upload survey Excel file from `/survey` page
2. Select questions to analyze
3. Set statistical testing method
4. Run analysis and check results

### AI Table Analysis
1. Access `/table-analysis` page
2. Input OpenAI API key
3. Upload statistical table file and original data file
4. Select analysis method (single/batch)
5. Run AI analysis and check real-time progress

## 🔧 LangGraph Workflow

### Workflow Steps
1. **Table Parser**: Parse survey table
2. **Hypothesis Generation**: Generate analysis hypothesis
3. **Test Decision**: Determine statistical testing method (Rule-based + LLM)
4. **FT Analysis**: Perform statistical analysis (F/T-test, Chi-square, Manual)
5. **Anchor Points**: Extract key points
6. **Table Analysis**: Generate comprehensive analysis report
7. **Hallucination Check**: AI hallucination verification (max 4 retries)
8. **Sentence Polish**: Sentence polishing

### Test Decision Node Details
**3-step decision process:**

1. **Rule-based determination**:
   - Multiple response/rank pattern → `manual` analysis
   - Category expression pattern → `ft_test` (F-test/T-test)
   - Default value → `chi_square` (Chi-square test)

2. **User setting confirmation**:
   - User-defined analysis plan priority
   - Statistical testing usage setting

3. **LLM-based determination**:
   - Intelligent determination using GPT-4o-mini
   - Analysis based on column name and question text
   - Continuous vs categorical data distinction

**Supported statistical testing:**
- `ft_test`: F-test, T-test (Continuous numerical data)
- `chi_square`: Chi-square test (Categorical selection data)
- `manual`: Manual analysis required (Multiple responses, etc.)

### FT Analysis Node Details
**Statistical analysis features:**

1. **F/T-test analysis**:
   - T-test (2-group comparison)
   - F-test/ANOVA (3-group or more comparison)
   - Levene's test for homogeneity of variances
   - Automatic data collection and processing by group

2. **Chi-square test**:
   - Automatic cross-table generation
   - Chi-square statistic calculation
   - Degree of freedom and p-value calculation
   - Categorical data analysis

3. **Manual analysis**:
   - Analysis based on confidence interval
   - Significance test against overall average
   - Standard error and z-score calculation

**Significance indication:**
- `***`: p < 0.001 (Very significant)
- `**`: p < 0.01 (Significant)
- `*`: p < 0.05 (Boundary significant)

**Natural language summary:**
- Automatic identification of significant items
- Statistical difference explanation
- Mention of top items based on p-value
- Multi-language support (Korean/English)

### State Management
```typescript
interface WorkflowState {
  analysis_type: boolean;
  selected_question?: string;
  linearized_table?: string;
  hypothesis?: string;
  test_decision?: string;
  analysis_result?: string;
  anchor_points?: string[];
  table_analysis?: string;
  hallucination_check?: boolean;
  revision_count?: number;
  polishing_result?: string;
}
```

## 📁 Project Structure

```
SimFilter_Test/
├── app/                    # Next.js app router
│   ├── analysis/          # General data analysis
│   ├── survey/            # Survey analysis
│   ├── table-analysis/    # AI table analysis
│   └── upload/            # File upload
├── components/            # UI components
├── lib/                   # Utilities and settings
│   ├── ai/               # AI-related logic
│   │   ├── workflowEngine.ts    # JavaScript workflow
│   │   └── langgraphClient.ts   # Python API client
│   ├── analysis/         # Analysis logic
│   └── db/               # Database settings
├── backend/              # Python backend
│   ├── langgraph_api.py  # FastAPI LangGraph server
│   └── requirements.txt  # Python dependencies
└── public/               # Static files
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is distributed under the MIT License.

## 🆘 Support

If you encounter issues or have questions, please create an issue.

---

**Note**: To use LangGraph API, the Python backend must be running. JavaScript workflow engine runs directly in the browser but requires an OpenAI API key.