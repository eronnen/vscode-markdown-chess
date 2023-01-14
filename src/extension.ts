import * as vscode from 'vscode';
import {markdownItChessgroundPlugin} from './markdownItChessgroundPlugin';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "vscode-markdown-chess" is now active!');
	return {
		extendMarkdownIt(md: any) {
				md.use(markdownItChessgroundPlugin);
				return md;
		}
	};
}

// This method is called when your extension is deactivated
export function deactivate() {}
