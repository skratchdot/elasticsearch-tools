## Should Do

- Use gulp
- Add unit tests
- Use travis ci
- Add badges to README
- Add more tools

## Might Do

- Allow different inputs/outputs: url, file, stdin, stdout
- One CLI Tool: instead of multiple cli tools, have 1 tool that uses commands:
  - instead of `es-export-bulk [options]` use `es-export bulk [options]`
  - instead of `es-import-mappings [options]` use `es-import mappings [options]`
- Config folder/file
  - setup .es-tool in the home dir, so --url and --file don't need to be passed each time
  - potentially allow aliases (prod vs dev, etc)
