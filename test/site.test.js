const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const root = path.resolve(__dirname, '..');

function readJson(file) {
    return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

describe('portfolio site', () => {
    it('has valid project data and existing media files', () => {
        const projects = readJson('projects.json');

        assert.ok(Array.isArray(projects), 'projects.json should contain an array');
        assert.ok(projects.length > 0, 'projects.json should contain at least one project');

        for (const project of projects.filter((item) => item.status === 'live')) {
            assert.equal(typeof project.title, 'string', 'live projects need a title');
            assert.equal(typeof project.client, 'string', 'live projects need a client');
            assert.equal(typeof project.count, 'number', 'live projects need a numeric count');
            assert.equal(typeof project.image, 'string', 'live projects need an image path');
            assert.ok(
                fs.existsSync(path.join(root, project.image)),
                `missing project image: ${project.image}`
            );

            if (project.audio) {
                assert.ok(
                    fs.existsSync(path.join(root, project.audio)),
                    `missing project audio: ${project.audio}`
                );
            }
        }
    });

    it('has existing local assets linked from each page', () => {
        for (const page of ['index.html', 'about.html']) {
            const html = fs.readFileSync(path.join(root, page), 'utf8');
            const references = html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g);

            for (const [, reference] of references) {
                if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;

                const localPath = reference.split(/[?#]/, 1)[0];
                assert.ok(
                    fs.existsSync(path.resolve(root, path.dirname(page), localPath)),
                    `${page} references missing local asset: ${reference}`
                );
            }
        }
    });
});
