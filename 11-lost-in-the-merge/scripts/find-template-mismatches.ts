import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import ts from 'typescript'
import {
  ASTWithSource,
  Binary,
  CombinedRecursiveAstVisitor,
  Conditional,
  DomElementSchemaRegistry,
  ImplicitReceiver,
  Interpolation,
  Lexer,
  NonNullAssert,
  ParenthesizedExpression,
  ParsedEventType,
  ParseLocation,
  ParseSourceFile,
  ParseSourceSpan,
  Parser,
  PrefixNot,
  PropertyRead,
  R3TargetBinder,
  ThisReceiver,
  parseTemplate,
} from '@angular/compiler'
import type {
  AST,
  BoundTarget,
  TmplAstBoundText,
  TmplAstElement,
  TmplAstForLoopBlock,
  TmplAstIfBlockBranch,
  TmplAstSwitchBlock,
} from '@angular/compiler'

type MemberKind = 'state' | 'signal-input' | 'method' | 'output' | 'other'

interface Member {
  name: string
  kind: MemberKind
  line: number
}

interface ClassInfo {
  name: string
  file: string
  baseName: string | null
  members: Map<string, Member>
  classReads: Set<string>
  component: ComponentMeta | null
}

interface ComponentMeta {
  selectors: string[]
  outputs: Set<string>
  template: TemplateSource | null
  hostExpressions: string[][]
}

interface TemplateSource {
  text: string
  file: string
  firstLine: number
}

interface Hit {
  file: string
  line: number
  kind: 'missing-member' | 'unused-member' | 'signal-not-called' | 'unknown-output' | 'parse-error'
  message: string
}

const STATE_FACTORIES = new Set(['signal', 'computed', 'linkedSignal', 'toSignal'])
const SIGNAL_INPUT_FACTORIES = new Set(['input', 'input.required', 'model', 'model.required'])
const OUTPUT_FACTORIES = new Set(['output', 'outputFromObservable'])
const LIFECYCLE_HOOKS = new Set([
  'ngOnChanges',
  'ngOnInit',
  'ngDoCheck',
  'ngAfterContentInit',
  'ngAfterContentChecked',
  'ngAfterViewInit',
  'ngAfterViewChecked',
  'ngOnDestroy',
])
const TEMPLATE_BUILTINS = new Set(['$event', '$any'])
const schemaRegistry = new DomElementSchemaRegistry()

function listSourceFiles(paths: string[]): string[] {
  const files: string[] = []

  for (const path of paths) {
    const stats = statSync(path)

    if (stats.isFile()) {
      files.push(path)
      continue
    }

    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const isSkippedDir = entry.name.startsWith('.') || entry.name === 'node_modules'
      const fullPath = join(path, entry.name)

      if (entry.isDirectory() && !isSkippedDir) {
        files.push(...listSourceFiles([fullPath]))
        continue
      }

      const isSource =
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.spec.ts') &&
        !entry.name.endsWith('.d.ts')

      if (entry.isFile() && isSource) {
        files.push(fullPath)
      }
    }
  }

  return files
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function stringValue(node: ts.Expression | undefined): string | null {
  if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
    return node.text
  }

  return null
}

function factoryName(initializer: ts.Expression | undefined): string | null {
  if (!initializer || !ts.isCallExpression(initializer)) {
    return null
  }

  const callee = initializer.expression

  if (ts.isIdentifier(callee)) {
    return callee.text
  }

  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return `${callee.expression.text}.${callee.name.text}`
  }

  return null
}

function aliasOption(call: ts.CallExpression): string | null {
  for (const arg of call.arguments) {
    if (!ts.isObjectLiteralExpression(arg)) {
      continue
    }

    for (const property of arg.properties) {
      const isAlias = ts.isPropertyAssignment(property) && property.name.getText() === 'alias'

      if (isAlias) {
        return stringValue(property.initializer)
      }
    }
  }

  return null
}

function decoratorCall(node: ts.Node, name: string): ts.CallExpression | null {
  const decorators = ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []

  for (const decorator of decorators) {
    const expression = decorator.expression
    const isMatch =
      ts.isCallExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === name

    if (isMatch) {
      return expression
    }
  }

  return null
}

function objectProperty(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  for (const property of object.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      property.name.getText().replace(/['"]/g, '') === name
    ) {
      return property.initializer
    }
  }

  return undefined
}

function readComponentMeta(
  classNode: ts.ClassDeclaration,
  file: string,
  sourceFile: ts.SourceFile,
): ComponentMeta | null {
  const call = decoratorCall(classNode, 'Component')
  const metadata = call?.arguments[0]

  if (!metadata || !ts.isObjectLiteralExpression(metadata)) {
    return null
  }

  const selector = stringValue(objectProperty(metadata, 'selector')) ?? ''
  const selectors = selector
    .split(',')
    .map((part) => /^[a-zA-Z][\w-]*/.exec(part.trim())?.[0])
    .filter((tag): tag is string => !!tag)

  const inlineTemplate = objectProperty(metadata, 'template')
  const inlineText = stringValue(inlineTemplate)
  const templateUrl = stringValue(objectProperty(metadata, 'templateUrl'))
  let template: TemplateSource | null = null

  if (inlineTemplate && inlineText !== null) {
    template = {
      text: inlineText,
      file,
      firstLine: sourceFile.getLineAndCharacterOfPosition(inlineTemplate.getStart(sourceFile)).line,
    }
  }

  if (templateUrl) {
    const templateFile = resolve(dirname(file), templateUrl)

    template = { text: readFileSync(templateFile, 'utf8'), file: templateFile, firstLine: 0 }
  }

  const hostExpressions: string[][] = []
  const host = objectProperty(metadata, 'host')

  if (host && ts.isObjectLiteralExpression(host)) {
    for (const property of host.properties) {
      const key =
        ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name)
          ? property.name.text
          : null
      const value = ts.isPropertyAssignment(property) ? stringValue(property.initializer) : null
      const isBinding = !!key && (key.startsWith('(') || key.startsWith('['))

      if (key && value && isBinding) {
        hostExpressions.push([key, value])
      }
    }
  }

  return { selectors, outputs: new Set(), template, hostExpressions }
}

function readClass(classNode: ts.ClassDeclaration, file: string, sourceFile: ts.SourceFile) {
  const name = classNode.name?.text ?? '(anonymous)'
  const extendsClause = classNode.heritageClauses?.find(
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
  )
  const baseName = extendsClause?.types[0]?.expression.getText(sourceFile) ?? null
  const members = new Map<string, Member>()
  const classReads = new Set<string>()
  const component = readComponentMeta(classNode, file, sourceFile)

  for (const member of classNode.members) {
    const isStatic = ts.canHaveModifiers(member)
      ? !!ts.getModifiers(member)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)
      : false

    if (isStatic) {
      continue
    }

    if (ts.isConstructorDeclaration(member)) {
      for (const parameter of member.parameters) {
        const isParameterProperty = !!ts.getModifiers(parameter)?.length

        if (isParameterProperty && ts.isIdentifier(parameter.name)) {
          const memberName = parameter.name.text

          members.set(memberName, {
            name: memberName,
            kind: 'other',
            line: lineOf(sourceFile, parameter),
          })
        }
      }

      continue
    }

    const memberName = member.name && ts.isIdentifier(member.name) ? member.name.text : null

    if (!memberName) {
      continue
    }

    let kind: MemberKind = 'other'

    if (ts.isPropertyDeclaration(member)) {
      const factory = factoryName(member.initializer)
      const alias =
        member.initializer && ts.isCallExpression(member.initializer)
          ? aliasOption(member.initializer)
          : null
      const outputDecorator = decoratorCall(member, 'Output')

      if (factory && STATE_FACTORIES.has(factory)) {
        kind = 'state'
      }

      if (factory && SIGNAL_INPUT_FACTORIES.has(factory)) {
        kind = 'signal-input'
      }

      if (factory?.startsWith('model')) {
        component?.outputs.add(`${alias ?? memberName}Change`)
      }

      if (factory && OUTPUT_FACTORIES.has(factory)) {
        kind = 'output'
        component?.outputs.add(alias ?? memberName)
      }

      if (outputDecorator) {
        kind = 'output'
        component?.outputs.add(stringValue(outputDecorator.arguments[0]) ?? memberName)
      }
    }

    const isHostListener = !!decoratorCall(member, 'HostListener')

    if (ts.isMethodDeclaration(member) && !LIFECYCLE_HOOKS.has(memberName) && !isHostListener) {
      kind = 'method'
    }

    members.set(memberName, { name: memberName, kind, line: lineOf(sourceFile, member) })
  }

  const collectReads = (node: ts.Node) => {
    const isThisAccess =
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
      node.expression.kind === ts.SyntaxKind.ThisKeyword

    if (isThisAccess && ts.isPropertyAccessExpression(node)) {
      classReads.add(node.name.text)
    }

    if (isThisAccess && ts.isElementAccessExpression(node)) {
      const key = stringValue(node.argumentExpression)

      if (key) {
        classReads.add(key)
      }
    }

    ts.forEachChild(node, collectReads)
  }

  ts.forEachChild(classNode, collectReads)

  return { name, file, baseName, members, classReads, component }
}

function readClasses(file: string): ClassInfo[] {
  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )
  const classes: ClassInfo[] = []

  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node)) {
      classes.push(readClass(node, file, sourceFile))
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return classes
}

function isComponentReceiver(ast: AST): boolean {
  return ast instanceof ImplicitReceiver || ast instanceof ThisReceiver
}

function valueReads(ast: AST | null): PropertyRead[] {
  if (!ast) {
    return []
  }

  if (ast instanceof ASTWithSource) {
    return valueReads(ast.ast)
  }

  if (ast instanceof Interpolation) {
    return ast.expressions.flatMap((expression) => valueReads(expression))
  }

  const isWrapper =
    ast instanceof PrefixNot ||
    ast instanceof ParenthesizedExpression ||
    ast instanceof NonNullAssert

  if (isWrapper) {
    return valueReads(ast.expression)
  }

  if (ast instanceof Binary) {
    return [...valueReads(ast.left), ...valueReads(ast.right)]
  }

  if (ast instanceof Conditional) {
    return [...valueReads(ast.condition), ...valueReads(ast.trueExp), ...valueReads(ast.falseExp)]
  }

  if (ast instanceof PropertyRead && isComponentReceiver(ast.receiver)) {
    return [ast]
  }

  return []
}

interface ElementEvent {
  tag: string
  name: string
  offset: number
}

class TemplateReads extends CombinedRecursiveAstVisitor {
  readonly reads: PropertyRead[] = []
  readonly valueReads: PropertyRead[] = []
  readonly elementEvents: ElementEvent[] = []
  readonly boundTarget: BoundTarget<never> | null

  constructor(boundTarget: BoundTarget<never> | null) {
    super()
    this.boundTarget = boundTarget
  }

  override visitPropertyRead(ast: PropertyRead, context: unknown) {
    const isLocal = !!this.boundTarget?.getExpressionTarget(ast)

    if (isComponentReceiver(ast.receiver) && !isLocal && !TEMPLATE_BUILTINS.has(ast.name)) {
      this.reads.push(ast)
    }

    super.visitPropertyRead(ast, context)
  }

  override visitForLoopBlock(block: TmplAstForLoopBlock) {
    super.visitForLoopBlock(block)

    if (block.trackBy) {
      this.visit(block.trackBy)
    }
  }

  override visitBoundText(text: TmplAstBoundText) {
    this.valueReads.push(...valueReads(text.value))
    super.visitBoundText(text)
  }

  override visitIfBlockBranch(block: TmplAstIfBlockBranch) {
    this.valueReads.push(...valueReads(block.expression))
    super.visitIfBlockBranch(block)
  }

  override visitSwitchBlock(block: TmplAstSwitchBlock) {
    this.valueReads.push(...valueReads(block.expression))
    super.visitSwitchBlock(block)
  }

  override visitElement(element: TmplAstElement) {
    for (const event of element.outputs) {
      const isListener =
        event.type === ParsedEventType.Regular || event.type === ParsedEventType.TwoWay

      if (isListener && !event.target) {
        this.elementEvents.push({
          tag: element.name,
          name: event.name,
          offset: event.sourceSpan.start.offset,
        })
      }
    }

    super.visitElement(element)
  }
}

function parseHostExpressions(meta: ComponentMeta): TemplateReads {
  const reads = new TemplateReads(null)
  const parser = new Parser(new Lexer())

  for (const [key, value] of meta.hostExpressions) {
    const location = new ParseLocation(new ParseSourceFile(value, 'host'), 0, 0, 0)
    const span = new ParseSourceSpan(location, location)
    const ast = key.startsWith('(')
      ? parser.parseAction(value, span, 0)
      : parser.parseBinding(value, span, 0)

    reads.visit(ast)
  }

  return reads
}

function inheritedMembers(
  info: ClassInfo,
  classes: Map<string, ClassInfo>,
): Map<string, Member> | null {
  if (!info.baseName) {
    return info.members
  }

  const base = classes.get(info.baseName)
  const baseMembers = base ? inheritedMembers(base, classes) : null

  if (!baseMembers) {
    return null
  }

  return new Map([...baseMembers, ...info.members])
}

function templateLine(template: TemplateSource, offset: number): number {
  return template.firstLine + template.text.slice(0, offset).split('\n').length
}

function knownEvents(tag: string): string[] {
  const events = schemaRegistry.allKnownEventsOfElement(tag)

  return events.length > 0 ? events : schemaRegistry.allKnownEventsOfElement('div')
}

function checkComponent(
  info: ClassInfo,
  classes: Map<string, ClassInfo>,
  componentsByTag: Map<string, ClassInfo[]>,
): Hit[] {
  const template = info.component?.template

  if (!info.component || !template) {
    return []
  }

  const parsed = parseTemplate(template.text, template.file, {})

  if (parsed.errors) {
    return parsed.errors.map((error) => ({
      file: template.file,
      line: templateLine(template, error.span.start.offset),
      kind: 'parse-error',
      message: `checks skipped for ${info.name}: ${error.msg}`,
    }))
  }

  const boundTarget = new R3TargetBinder<never>(null).bind({ template: parsed.nodes })
  const templateReads = new TemplateReads(boundTarget)

  for (const node of parsed.nodes) {
    templateReads.visit(node)
  }

  const hostReads = parseHostExpressions(info.component)
  const readNames = new Set([...templateReads.reads, ...hostReads.reads].map((read) => read.name))
  const members = inheritedMembers(info, classes)
  const hits: Hit[] = []
  const reported = new Set<string>()

  if (!members) {
    console.error(
      `skipped missing-member check for ${info.name}: base class ${info.baseName} is not in the scanned files`,
    )
  }

  for (const read of templateReads.reads) {
    const isMissing = !!members && !members.has(read.name) && !reported.has(read.name)

    if (isMissing) {
      reported.add(read.name)
      hits.push({
        file: template.file,
        line: templateLine(template, read.sourceSpan.start),
        kind: 'missing-member',
        message: `${read.name}: the template of ${info.name} reads it, the class does not declare it`,
      })
    }
  }

  for (const member of info.members.values()) {
    const isCandidate = member.kind === 'state' || member.kind === 'method'
    const isRead = readNames.has(member.name) || info.classReads.has(member.name)

    if (isCandidate && !isRead) {
      hits.push({
        file: info.file,
        line: member.line,
        kind: 'unused-member',
        message: `${member.name}: ${info.name} declares this ${member.kind === 'method' ? 'method' : 'signal'}, nothing in its template or class reads it`,
      })
    }
  }

  for (const read of templateReads.valueReads) {
    const member = members?.get(read.name)
    const isSignal = member?.kind === 'state' || member?.kind === 'signal-input'
    const isLocal = !!boundTarget.getExpressionTarget(read)

    if (isSignal && !isLocal) {
      hits.push({
        file: template.file,
        line: templateLine(template, read.sourceSpan.start),
        kind: 'signal-not-called',
        message: `${read.name}: the template of ${info.name} uses this signal as a value without calling it`,
      })
    }
  }

  for (const event of templateReads.elementEvents) {
    const children = componentsByTag.get(event.tag) ?? []
    const isOutput = children.some((child) => child.component?.outputs.has(event.name))
    const isDomEvent = knownEvents(event.tag).includes(event.name.split('.')[0])

    if (children.length > 0 && !isOutput && !isDomEvent) {
      hits.push({
        file: template.file,
        line: templateLine(template, event.offset),
        kind: 'unknown-output',
        message: `(${event.name}) on <${event.tag}>: ${children[0].name} has no output with this name, Angular binds it as a DOM event`,
      })
    }
  }

  return hits
}

const paths = process.argv.slice(2)

if (paths.length === 0) {
  console.error('usage: node find-template-mismatches.ts <dir-or-file>...')
  process.exit(2)
}

const classes = new Map<string, ClassInfo>()
const componentsByTag = new Map<string, ClassInfo[]>()
const allClasses = listSourceFiles(paths).flatMap((file) => readClasses(file))

for (const info of allClasses) {
  classes.set(info.name, info)

  for (const tag of info.component?.selectors ?? []) {
    componentsByTag.set(tag, [...(componentsByTag.get(tag) ?? []), info])
  }
}

const components = allClasses.filter((info) => info.component?.template)
const hits = components
  .flatMap((info) => checkComponent(info, classes, componentsByTag))
  .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)

for (const hit of hits) {
  console.log(`${relative(process.cwd(), hit.file)}:${hit.line}  ${hit.kind}  ${hit.message}`)
}

console.log(`${hits.length} hit(s) in ${components.length} component(s)`)
process.exit(hits.length > 0 ? 1 : 0)
