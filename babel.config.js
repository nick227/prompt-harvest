export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current'
        }
      }
    ]
  ],
  plugins: [
    // Transform import.meta for Jest tests
    function transformImportMeta({ types: t }) {
      return {
        visitor: {
          MemberExpression(path) {
            if (
              path.node.object.type === 'MetaProperty' &&
              path.node.object.meta.name === 'import' &&
              path.node.object.property.name === 'meta'
            ) {
              // Replace import.meta.url with a test file path
              if (path.node.property.name === 'url') {
                path.replaceWith(
                  t.stringLiteral('file:///test/mock-file.js')
                );
              }
            }
          }
        }
      };
    }
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            }
          }
        ]
      ]
    }
  }
};
