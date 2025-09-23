/**
 * Script to capture current JavaScript file structure
 * Run this before refactoring to create a baseline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StructureCapture {
  constructor() {
    this.basePath = path.join(__dirname, '..', 'public', 'js');
    this.structure = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      directories: {},
      files: [],
      dependencies: {},
      issues: []
    };
  }

  // Main capture function
  async capture() {
    console.log('📸 Capturing current JavaScript structure...');
    console.log(`📁 Base path: ${this.basePath}`);

    try {
      if (!fs.existsSync(this.basePath)) {
        throw new Error(`Base path does not exist: ${this.basePath}`);
      }

      await this.scanDirectory(this.basePath, '');
      await this.analyzeDependencies();
      await this.identifyIssues();
      await this.generateReport();

      console.log('✅ Structure capture complete!');
      console.log(`📊 Found ${this.structure.totalFiles} JavaScript files`);

    } catch (error) {
      console.error('❌ Error capturing structure:', error);
      throw error;
    }
  }

  // Recursively scan directory
  async scanDirectory(dirPath, relativePath) {
    const fullPath = path.join(dirPath, relativePath);

    if (!fs.existsSync(fullPath)) {
      return;
    }

    const items = fs.readdirSync(fullPath);

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const relativeItemPath = path.join(relativePath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!['node_modules', '.git', 'coverage', 'test-results'].includes(item)) {
          this.structure.directories[relativeItemPath] = {
            path: relativeItemPath,
            files: [],
            subdirectories: []
          };
          await this.scanDirectory(dirPath, relativeItemPath);
        }
      } else if (item.endsWith('.js')) {
        this.structure.totalFiles++;
        const fileInfo = await this.analyzeFile(itemPath, relativeItemPath);
        this.structure.files.push(fileInfo);

        // Add to directory structure
        const dirPath = path.dirname(relativeItemPath);
        if (this.structure.directories[dirPath]) {
          this.structure.directories[dirPath].files.push(fileInfo);
        }
      }
    }
  }

  // Analyze individual file
  async analyzeFile(filePath, relativePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);

    return {
      name: path.basename(filePath),
      path: relativePath,
      size: stat.size,
      lines: content.split('\n').length,
      lastModified: stat.mtime.toISOString(),
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      classes: this.extractClasses(content),
      functions: this.extractFunctions(content),
      issues: this.analyzeFileIssues(content, relativePath)
    };
  }

  // Extract import statements
  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({ type: 'import', path: match[1] });
    }

    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({ type: 'require', path: match[1] });
    }

    return imports;
  }

  // Extract export statements
  extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    const moduleExportsRegex = /module\.exports\s*=\s*(\w+)/g;

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push({ type: 'export', name: match[1] });
    }

    while ((match = moduleExportsRegex.exec(content)) !== null) {
      exports.push({ type: 'module.exports', name: match[1] });
    }

    return exports;
  }

  // Extract class definitions
  extractClasses(content) {
    const classes = [];
    const classRegex = /class\s+(\w+)/g;

    let match;
    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }

    return classes;
  }

  // Extract function definitions
  extractFunctions(content) {
    const functions = [];
    const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\(|=>))/g;

    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2];
      if (funcName) {
        functions.push(funcName);
      }
    }

    return functions;
  }

  // Analyze file for common issues
  analyzeFileIssues(content, filePath) {
    const issues = [];

    // Check naming conventions
    if (!/^[a-z][a-z0-9-]*\.js$/.test(path.basename(filePath))) {
      issues.push('Inconsistent file naming (should be kebab-case)');
    }

    // Check for TODO comments
    if (content.includes('TODO') || content.includes('FIXME')) {
      issues.push('Contains TODO/FIXME comments');
    }

    // Check for console.log statements
    if (content.includes('console.log')) {
      issues.push('Contains console.log statements');
    }

    // Check for large files
    const lines = content.split('\n').length;
    if (lines > 200) {
      issues.push(`Large file (${lines} lines, should be <200)`);
    }

    // Check for duplicate code patterns
    if (this.hasDuplicateCode(content)) {
      issues.push('Potential duplicate code detected');
    }

    return issues;
  }

  // Check for duplicate code patterns
  hasDuplicateCode(content) {
    const lines = content.split('\n');
    const lineCounts = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 20) { // Only check substantial lines
        lineCounts[trimmed] = (lineCounts[trimmed] || 0) + 1;
      }
    }

    // Check for lines that appear more than 3 times
    return Object.values(lineCounts).some(count => count > 3);
  }

  // Analyze dependencies between files
  async analyzeDependencies() {
    console.log('🔍 Analyzing dependencies...');

    for (const file of this.structure.files) {
      for (const importInfo of file.imports) {
        const importPath = importInfo.path;

        if (!this.structure.dependencies[importPath]) {
          this.structure.dependencies[importPath] = {
            path: importPath,
            usedBy: [],
            type: 'external' // Default to external
          };
        }

        this.structure.dependencies[importPath].usedBy.push(file.path);

        // Check if it's an internal dependency
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          this.structure.dependencies[importPath].type = 'internal';
        }
      }
    }
  }

  // Identify structural issues
  async identifyIssues() {
    console.log('🚨 Identifying structural issues...');

    // Check for duplicate file names
    const fileNames = this.structure.files.map(f => f.name);
    const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);

    if (duplicates.length > 0) {
      this.structure.issues.push({
        type: 'duplicate_names',
        message: 'Duplicate file names found',
        files: [...new Set(duplicates)]
      });
    }

    // Check for empty directories
    const emptyDirs = Object.entries(this.structure.directories)
      .filter(([path, dir]) => dir.files.length === 0)
      .map(([path]) => path);

    if (emptyDirs.length > 0) {
      this.structure.issues.push({
        type: 'empty_directories',
        message: 'Empty directories found',
        directories: emptyDirs
      });
    }

    // Check for files with many issues
    const problematicFiles = this.structure.files.filter(f => f.issues.length > 2);

    if (problematicFiles.length > 0) {
      this.structure.issues.push({
        type: 'problematic_files',
        message: 'Files with multiple issues',
        files: problematicFiles.map(f => ({ path: f.path, issues: f.issues }))
      });
    }
  }

  // Generate comprehensive report
  async generateReport() {
    const reportPath = path.join(__dirname, '..', 'docs', 'CURRENT_STRUCTURE_REPORT.json');

    // Ensure docs directory exists
    const docsDir = path.dirname(reportPath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(this.structure, null, 2));

    // Generate summary report
    const summaryPath = path.join(__dirname, '..', 'docs', 'STRUCTURE_SUMMARY.md');
    const summary = this.generateSummary();
    fs.writeFileSync(summaryPath, summary);

    console.log(`📄 Report saved to: ${reportPath}`);
    console.log(`📄 Summary saved to: ${summaryPath}`);
  }

  // Generate markdown summary
  generateSummary() {
    const { totalFiles, directories, issues } = this.structure;

    let summary = `# Current JavaScript Structure Summary\n\n`;
    summary += `**Generated:** ${new Date().toISOString()}\n\n`;
    summary += `## Overview\n\n`;
    summary += `- **Total Files:** ${totalFiles}\n`;
    summary += `- **Directories:** ${Object.keys(directories).length}\n`;
    summary += `- **Issues Found:** ${issues.length}\n\n`;

    summary += `## Directory Structure\n\n`;
    for (const [dirPath, dirInfo] of Object.entries(directories)) {
      summary += `### ${dirPath}\n`;
      summary += `- Files: ${dirInfo.files.length}\n`;
      if (dirInfo.files.length > 0) {
        summary += `- Files: ${dirInfo.files.map(f => f.name).join(', ')}\n`;
      }
      summary += `\n`;
    }

    if (issues.length > 0) {
      summary += `## Issues Found\n\n`;
      for (const issue of issues) {
        summary += `### ${issue.type}\n`;
        summary += `${issue.message}\n\n`;
        if (issue.files) {
          summary += `**Files:** ${issue.files.join(', ')}\n\n`;
        }
        if (issue.directories) {
          summary += `**Directories:** ${issue.directories.join(', ')}\n\n`;
        }
      }
    }

    return summary;
  }
}

// Run if called directly
const capture = new StructureCapture();
capture.capture().catch(console.error);

export default StructureCapture;
