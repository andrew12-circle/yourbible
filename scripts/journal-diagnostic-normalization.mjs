import ts from 'typescript';

const printer = ts.createPrinter({ removeComments: false });

/** TypeScript can print an identical union in a different order after unrelated imports change.
 * Parse quoted types and sort only union members. Do not drop members, diagnostics or files.
 * Malformed/truncated diagnostic types are kept verbatim and therefore fail closed.
 */
export function normalizeDiagnosticUnions(message) {
  return message.replace(/'([^'\r\n]*)'/g, (quoted, typeText) => {
    const source = ts.createSourceFile('diagnostic.ts', `type __Diagnostic = ${typeText};`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (source.parseDiagnostics.length || source.statements.length !== 1 || !ts.isTypeAliasDeclaration(source.statements[0])) return quoted;
    const node = source.statements[0].type;
    const render = (type) => printer.printNode(ts.EmitHint.Unspecified, type, source);
    let changed = false;
    const transformed = ts.transform(node, [(context) => {
      const visit = (current) => {
        const children = ts.visitEachChild(current, visit, context);
        if (!ts.isUnionTypeNode(children)) return children;
        changed = true;
        const ordered = [...children.types].sort((a, b) => {
          const left = render(a), right = render(b);
          return left < right ? -1 : left > right ? 1 : 0;
        });
        return ts.factory.updateUnionTypeNode(children, ordered);
      };
      return (root) => ts.visitNode(root, visit);
    }]);
    try {
      return changed ? `'${render(transformed.transformed[0])}'` : quoted;
    } finally {
      transformed.dispose();
    }
  });
}
