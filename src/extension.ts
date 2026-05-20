import * as vscode from 'vscode';
import * as path from 'path';
// @ts-ignore
import { exec } from 'child-process-promise';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Jupyter to PNG Converter');

  const disposable = vscode.commands.registerCommand(
    'ipynb-to-png-converter.convertToPng',
    async (fileUri: vscode.Uri) => {
      if (!fileUri) {
        vscode.window.showErrorMessage('Please select a .ipynb file');
        return;
      }

      const filePath = fileUri.fsPath;

      if (!filePath.endsWith('.ipynb')) {
        vscode.window.showErrorMessage('Please select a .ipynb file');
        return;
      }

      await convertNotebookToPng(filePath);
    }
  );

  context.subscriptions.push(disposable);
}

async function convertNotebookToPng(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  const dirPath = path.dirname(filePath);

  outputChannel.clear();
  outputChannel.show();
  outputChannel.appendLine(`📝 Converting: ${fileName}`);

  try {
    // Get the path to the Python conversion script
    const pythonScriptPath = path.join(
      __dirname,
      '..',
      'python_scripts',
      'convert.py'
    );

    // Get device scale factor from settings
    const config = vscode.workspace.getConfiguration('ipynb-to-png-converter');
    const deviceScaleFactor = config.get<number>('deviceScaleFactor', 3);

    // Run the Python script
    outputChannel.appendLine(`Running conversion (scale factor: ${deviceScaleFactor})...`);
    
    try {
      const result = await exec(
        `python3 "${pythonScriptPath}" "${filePath}" ${deviceScaleFactor}`,
        { cwd: dirPath }
      );

      outputChannel.appendLine(result.stdout);

      // Get PNG file path
      const pngFilePath = filePath.replace(/\.ipynb$/, '.png');

      vscode.window.showInformationMessage(
        `✅ Successfully converted to PNG: ${path.basename(pngFilePath)}`
      );

      outputChannel.appendLine(`✅ Conversion completed: ${pngFilePath}`);
    } catch (error: any) {
      outputChannel.appendLine(`Error: ${error.stderr || error.message}`);
      vscode.window.showErrorMessage(
        `Failed to convert notebook: ${error.message}`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`❌ Error: ${errorMessage}`);
    vscode.window.showErrorMessage(`Conversion failed: ${errorMessage}`);
  }
}

export function deactivate() {}
