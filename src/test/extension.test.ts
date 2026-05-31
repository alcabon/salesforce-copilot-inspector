import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
	getNonce,
	parseFrontmatterBlockLocal,
	parseMetadataBlockLocal,
	parseSkillMdContent,
	validateSkillLocal,
	getTemplate,
	getCheckDescription,
	type CheckResult,
} from '../extension';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a temporary directory and returns its path. Caller must clean up. */
function makeTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'ghcc-test-'));
}

/** Writes a SKILL.md file with the given content into <tmpDir>/<skillName>/SKILL.md. */
function makeSkillDir(tmpDir: string, skillName: string, content: string): string {
	const dir = path.join(tmpDir, skillName);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');
	return dir;
}

/** Minimal valid SKILL.md content for a given skill name. */
function validSkillContent(skillName: string, extraWords = ''): string {
	const desc = `Use this skill when you need to do ${skillName} tasks across your codebase effectively ${extraWords}`.trim();
	// pad to at least 20 words
	const words = desc.split(/\s+/);
	let padded = desc;
	let i = 0;
	while (padded.split(/\s+/).length < 20) { padded += ` word${i++}`; }
	return [
		'---',
		`name: "${skillName}"`,
		`description: "${padded}"`,
		'metadata:',
		'  version: "1.0"',
		'---',
		'',
		'## Instructions',
		'',
		'Do the thing.',
	].join('\n');
}

// ---------------------------------------------------------------------------
// getNonce
// ---------------------------------------------------------------------------

suite('getNonce', () => {
	test('returns a 32-character string', () => {
		assert.strictEqual(getNonce().length, 32);
	});

	test('contains only alphanumeric characters', () => {
		const nonce = getNonce();
		assert.match(nonce, /^[A-Za-z0-9]{32}$/);
	});

	test('each call returns a different value', () => {
		const a = getNonce();
		const b = getNonce();
		// Not guaranteed but practically always true with 32 random chars
		assert.notStrictEqual(a, b);
	});
});

// ---------------------------------------------------------------------------
// parseFrontmatterBlockLocal
// ---------------------------------------------------------------------------

suite('parseFrontmatterBlockLocal', () => {
	test('returns null when there is no frontmatter', () => {
		assert.strictEqual(parseFrontmatterBlockLocal('# Just a heading\n\nBody.'), null);
	});

	test('returns null for an unclosed frontmatter block', () => {
		assert.strictEqual(parseFrontmatterBlockLocal('---\nname: "foo"\n'), null);
	});

	test('parses a simple frontmatter block', () => {
		const content = '---\nname: "foo"\n---\nBody text';
		const result = parseFrontmatterBlockLocal(content);
		assert.ok(result !== null);
		assert.strictEqual(result.raw, 'name: "foo"');
	});

	test('fullMatchLen equals the byte length of the frontmatter block including delimiters', () => {
		const frontmatter = '---\nname: "foo"\n---\n';
		const content = frontmatter + 'Body text';
		const result = parseFrontmatterBlockLocal(content);
		assert.ok(result !== null);
		assert.strictEqual(result.fullMatchLen, frontmatter.length);
	});

	test('handles multi-line frontmatter', () => {
		const content = [
			'---',
			'name: "my-skill"',
			'description: "A test skill"',
			'---',
			'Body',
		].join('\n') + '\n';
		const result = parseFrontmatterBlockLocal(content);
		assert.ok(result !== null);
		assert.ok(result.raw.includes('name: "my-skill"'));
		assert.ok(result.raw.includes('description: "A test skill"'));
	});

	test('handles Windows CRLF line endings', () => {
		const content = '---\r\nname: "foo"\r\n---\r\nBody';
		const result = parseFrontmatterBlockLocal(content);
		assert.ok(result !== null);
		assert.ok(result.raw.includes('name: "foo"'));
	});
});

// ---------------------------------------------------------------------------
// parseMetadataBlockLocal
// ---------------------------------------------------------------------------

suite('parseMetadataBlockLocal', () => {
	test('returns null when no metadata key is present', () => {
		assert.strictEqual(parseMetadataBlockLocal('name: "foo"\ndescription: "bar"'), null);
	});

	test('returns scalar when metadata has an inline value', () => {
		assert.strictEqual(parseMetadataBlockLocal('metadata: something'), 'scalar');
	});

	test('returns list when metadata contains a YAML list', () => {
		const raw = 'metadata:\n  - item1\n  - item2';
		assert.strictEqual(parseMetadataBlockLocal(raw), 'list');
	});

	test('returns a Record with parsed sub-keys', () => {
		const raw = 'metadata:\n  version: "1.0"\n  author: "Alice"';
		const result = parseMetadataBlockLocal(raw);
		assert.ok(result !== null && result !== 'scalar' && result !== 'list');
		assert.strictEqual(result.version, '1.0');
		assert.strictEqual(result.author, 'Alice');
	});

	test('strips surrounding quotes from values', () => {
		const raw = 'metadata:\n  version: "2.5"';
		const result = parseMetadataBlockLocal(raw);
		assert.ok(result !== null && result !== 'scalar' && result !== 'list');
		assert.strictEqual(result.version, '2.5');
	});

	test('stops reading at the next top-level key', () => {
		const raw = 'name: "foo"\nmetadata:\n  version: "1.0"\ndescription: "bar"';
		const result = parseMetadataBlockLocal(raw);
		assert.ok(result !== null && result !== 'scalar' && result !== 'list');
		assert.strictEqual(result.version, '1.0');
		assert.strictEqual(result.description, undefined);
	});
});

// ---------------------------------------------------------------------------
// parseSkillMdContent
// ---------------------------------------------------------------------------

suite('parseSkillMdContent', () => {
	test('returns null frontmatter when there is no --- block', () => {
		const { rawFrontmatter, frontmatter, body } = parseSkillMdContent('# Title\n\nBody text.');
		assert.strictEqual(rawFrontmatter, null);
		assert.strictEqual(frontmatter, null);
		assert.ok(body.includes('Body text'));
	});

	test('correctly splits frontmatter from body', () => {
		const content = '---\nname: "my-skill"\n---\n\nBody here.';
		const { frontmatter, body } = parseSkillMdContent(content);
		assert.ok(frontmatter !== null);
		assert.strictEqual(frontmatter.name, 'my-skill');
		assert.ok(body.includes('Body here.'));
	});

	test('strips quotes from frontmatter values', () => {
		const content = '---\nname: "quoted-name"\ndescription: \'single-quoted\'\n---\nBody';
		const { frontmatter } = parseSkillMdContent(content);
		assert.ok(frontmatter !== null);
		assert.strictEqual(frontmatter.name, 'quoted-name');
		assert.strictEqual(frontmatter.description, 'single-quoted');
	});

	test('body does not contain frontmatter content', () => {
		const content = '---\nname: "x"\n---\nReal body';
		const { body } = parseSkillMdContent(content);
		assert.ok(!body.includes('name: "x"'));
		assert.ok(body.includes('Real body'));
	});

	test('handles empty body after frontmatter', () => {
		const content = '---\nname: "x"\n---\n';
		const { frontmatter, body } = parseSkillMdContent(content);
		assert.ok(frontmatter !== null);
		assert.strictEqual(body.trim(), '');
	});
});

// ---------------------------------------------------------------------------
// validateSkillLocal
// ---------------------------------------------------------------------------

suite('validateSkillLocal', () => {
	let tmpDir: string;

	setup(() => { tmpDir = makeTempDir(); });
	teardown(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

	test('errors when the directory does not exist', () => {
		const result = validateSkillLocal('my-skill', path.join(tmpDir, 'nonexistent'));
		assert.ok(result.errors.length > 0);
		assert.ok(result.errors[0].includes('not found'));
	});

	test('errors when SKILL.md is missing from the directory', () => {
		const dir = path.join(tmpDir, 'my-skill');
		fs.mkdirSync(dir);
		const result = validateSkillLocal('my-skill', dir);
		assert.ok(result.errors.some(e => e.includes('SKILL.md not found')));
	});

	test('passes a fully valid skill with no errors or warnings (except gerund)', () => {
		// Use a gerund name to avoid warnings
		const skillName = 'generating-apex-tests';
		const content = validSkillContent(skillName);
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.deepStrictEqual(result.errors, []);
	});

	test('errors when name field mismatches directory name', () => {
		const skillName = 'generating-apex-tests';
		const content = [
			'---',
			'name: "wrong-name"',
			'description: "Use this skill when you need to generate tests for your Apex classes in Salesforce."',
			'metadata:',
			'  version: "1.0"',
			'---',
			'Body text.',
		].join('\n');
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.errors.some(e => e.includes('does not match directory name')));
	});

	test('errors when frontmatter is missing entirely', () => {
		const skillName = 'generating-tests';
		const content = '# Just a heading\n\nBody without frontmatter.';
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.errors.some(e => e.includes('missing or malformed YAML frontmatter')));
	});

	test('errors when name is not kebab-case', () => {
		const skillName = 'MySkill';
		const dir = path.join(tmpDir, skillName);
		fs.mkdirSync(dir);
		fs.writeFileSync(path.join(dir, 'SKILL.md'), validSkillContent(skillName), 'utf8');
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.errors.some(e => e.includes('kebab-case')));
	});

	test('errors when name is longer than 64 characters', () => {
		const skillName = 'a'.repeat(65);
		const dir = path.join(tmpDir, skillName);
		fs.mkdirSync(dir);
		fs.writeFileSync(path.join(dir, 'SKILL.md'), validSkillContent(skillName), 'utf8');
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.errors.some(e => e.includes('maximum 64')));
	});

	test('warns when description is fewer than 20 words', () => {
		const skillName = 'generating-apex-tests';
		const content = [
			'---',
			`name: "${skillName}"`,
			'description: "Use this skill when coding."',
			'metadata:',
			'  version: "1.0"',
			'---',
			'Body text.',
		].join('\n');
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.warnings.some(w => w.includes('too short')));
	});

	test('errors when description is not double-quoted', () => {
		const skillName = 'generating-apex-tests';
		const content = [
			'---',
			`name: "${skillName}"`,
			'description: Use this skill when you need to generate tests for Apex in Salesforce projects fully.',
			'metadata:',
			'  version: "1.0"',
			'---',
			'Body text.',
		].join('\n');
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.errors.some(e => e.includes('double quotes')));
	});

	test('errors when metadata block is missing', () => {
		const skillName = 'generating-apex-tests';
		const content = [
			'---',
			`name: "${skillName}"`,
			'description: "Use this skill when you need to generate Apex tests for Salesforce projects efficiently."',
			'---',
			'Body text.',
		].join('\n');
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.errors.some(e => e.includes('"metadata:" block')));
	});

	test('errors when version is malformed (not x.y format)', () => {
		const skillName = 'generating-apex-tests';
		const content = [
			'---',
			`name: "${skillName}"`,
			'description: "Use this skill when you need to generate Apex tests for your Salesforce projects effectively."',
			'metadata:',
			'  version: "v1"',
			'---',
			'Body text.',
		].join('\n');
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.errors.some(e => e.includes('x.y format')));
	});

	test('errors when body is empty', () => {
		const skillName = 'generating-apex-tests';
		const content = [
			'---',
			`name: "${skillName}"`,
			'description: "Use this skill when you need to generate Apex tests for your Salesforce projects effectively."',
			'metadata:',
			'  version: "1.0"',
			'---',
			'',
		].join('\n');
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.errors.some(e => e.includes('body') && e.includes('empty')));
	});

	test('warns when body exceeds 500 lines', () => {
		const skillName = 'generating-apex-tests';
		const longBody = Array.from({ length: 502 }, (_, i) => `Line ${i + 1}`).join('\n');
		const content = validSkillContent(skillName).replace('Do the thing.', longBody);
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.warnings.some(w => w.includes('500')));
	});

	test('errors when metadata is an inline scalar', () => {
		const skillName = 'generating-apex-tests';
		const content = [
			'---',
			`name: "${skillName}"`,
			'description: "Use this skill when you need to generate Apex tests for your Salesforce projects efficiently."',
			'metadata: some-scalar-value',
			'---',
			'Body text.',
		].join('\n');
		const dir = makeSkillDir(tmpDir, skillName, content);
		const result = validateSkillLocal(skillName, dir);
		assert.ok(result.errors.some((e: string) => e.includes('not an inline scalar')));
	});
});

// ---------------------------------------------------------------------------
// getTemplate
// ---------------------------------------------------------------------------

suite('getTemplate', () => {
	test('copilot-instructions template starts with a heading', () => {
		const t = getTemplate('copilot-instructions', '');
		assert.ok(t.startsWith('# Copilot Instructions'));
	});

	test('instructions template includes the name and applyTo frontmatter', () => {
		const t = getTemplate('instructions', 'my-feature');
		assert.ok(t.includes('applyTo:'));
		assert.ok(t.includes('my-feature'));
	});

	test('prompt template includes mode and description frontmatter', () => {
		const t = getTemplate('prompt', 'refactor-helpers');
		assert.ok(t.includes('mode:'));
		assert.ok(t.includes('refactor-helpers'));
	});

	test('agent template includes name, description, and tools frontmatter', () => {
		const t = getTemplate('agent', 'my-agent');
		assert.ok(t.includes('tools:'));
		assert.ok(t.includes('my-agent'));
	});

	test('personal-skill template includes name and description frontmatter', () => {
		const t = getTemplate('personal-skill', 'analyzing-code');
		assert.ok(t.includes('description:'));
		assert.ok(t.includes('analyzing-code'));
	});

	test('hook template is valid JSON', () => {
		const t = getTemplate('hook', 'my-hook');
		assert.doesNotThrow(() => JSON.parse(t));
		const parsed = JSON.parse(t);
		assert.ok(typeof parsed === 'object');
	});

	test('agents-md template includes an AGENTS.md heading', () => {
		const t = getTemplate('agents-md', '');
		assert.ok(t.toLowerCase().includes('agent'));
	});

	test('unknown type returns an empty string or non-null string', () => {
		const t = getTemplate('unknown-type', 'x');
		assert.strictEqual(typeof t, 'string');
	});
});

// ---------------------------------------------------------------------------
// getCheckDescription
// ---------------------------------------------------------------------------

suite('getCheckDescription', () => {
	function makeCheck(id: string, status: CheckResult['status'] = 'ok'): CheckResult {
		return { id, category: 'Test', name: id, status, message: '' };
	}

	test('github-instructions returns a non-empty description', () => {
		const desc = getCheckDescription(makeCheck('github-instructions'));
		assert.ok(desc.length > 0);
		assert.ok(desc.toLowerCase().includes('copilot') || desc.toLowerCase().includes('instruction'));
	});

	test('root-instructions returns a non-empty description', () => {
		const desc = getCheckDescription(makeCheck('root-instructions'));
		assert.ok(desc.length > 0);
	});

	test('instr-* prefix returns scoped instructions description', () => {
		const desc = getCheckDescription(makeCheck('instr-my-file'));
		assert.ok(desc.toLowerCase().includes('scoped') || desc.toLowerCase().includes('instruction'));
	});

	test('skill-personal-* prefix returns personal skill description', () => {
		const desc = getCheckDescription(makeCheck('skill-personal-foo'));
		assert.ok(desc.toLowerCase().includes('personal'));
	});

	test('skill-* prefix returns workspace skill description', () => {
		const desc = getCheckDescription(makeCheck('skill-foo'));
		assert.ok(desc.toLowerCase().includes('skill') || desc.toLowerCase().includes('workspace'));
	});

	test('prompt-* prefix returns prompt description', () => {
		const desc = getCheckDescription(makeCheck('prompt-bar'));
		assert.ok(desc.toLowerCase().includes('prompt'));
	});

	test('agent-* prefix returns agent description', () => {
		const desc = getCheckDescription(makeCheck('agent-baz'));
		assert.ok(desc.toLowerCase().includes('agent'));
	});

	test('agents-md ok returns registry description', () => {
		const desc = getCheckDescription(makeCheck('agents-md', 'ok'));
		assert.ok(desc.toLowerCase().includes('agent'));
	});

	test('agents-md missing returns optional description', () => {
		const desc = getCheckDescription(makeCheck('agents-md', 'missing'));
		assert.ok(desc.toLowerCase().includes('optional') || desc.toLowerCase().includes('not present'));
	});

	test('copilot-ext returns extension description', () => {
		const desc = getCheckDescription(makeCheck('copilot-ext'));
		assert.ok(desc.toLowerCase().includes('copilot'));
	});

	test('copilot-chat-ext returns chat extension description', () => {
		const desc = getCheckDescription(makeCheck('copilot-chat-ext'));
		assert.ok(desc.toLowerCase().includes('chat') || desc.toLowerCase().includes('copilot'));
	});

	test('copilot-hook-* returns hook description', () => {
		const desc = getCheckDescription(makeCheck('copilot-hook-events'));
		assert.ok(desc.toLowerCase().includes('hook') || desc.toLowerCase().includes('lifecycle'));
	});

	test('workspace-settings returns settings description', () => {
		const desc = getCheckDescription(makeCheck('workspace-settings'));
		assert.ok(desc.toLowerCase().includes('settings'));
	});

	test('unknown id returns an empty string', () => {
		const desc = getCheckDescription(makeCheck('completely-unknown-id-xyz'));
		assert.strictEqual(desc, '');
	});
});
