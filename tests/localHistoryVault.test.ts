import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearVaultSessions,
  createVaultFolder,
  deleteVaultFolder,
  listVaultFolders,
  listVaultSessions,
  moveSessionToFolder,
  renameVaultFolder,
  saveVaultSession,
} from '../src/lib/storage/localHistoryVault.ts';
import type { VaultSession } from '../src/types/longitudinal.ts';

function makeSession(overrides: Partial<VaultSession> & { id: string }): VaultSession {
  return {
    timestamp: '2026-11-25T10:00:00.000Z',
    title: 'Sample Run',
    domainTag: 'Clinical',
    folderId: null,
    metrics: [],
    rawSnippet: 'raw',
    hydratedReport: 'report',
    ...overrides,
  };
}

describe('localHistoryVault folder CRUD and session assignment', () => {
  beforeEach(async () => {
    await clearVaultSessions();
    const existingFolders = await listVaultFolders();
    for (const folder of existingFolders) {
      await deleteVaultFolder(folder.id);
    }
  });

  it('creates and lists folders with trimmed names and deterministic ordering', async () => {
    const first = await createVaultFolder('  Lab Reports  ', '#10b981');
    const second = await createVaultFolder('Tax Filings');

    expect(first.id).toMatch(/^folder_\d+_[a-z0-9]+$/);
    expect(first.name).toBe('Lab Reports');
    expect(first.color).toBe('#10b981');
    expect(first.createdAt).toBeTruthy();

    expect(second.name).toBe('Tax Filings');
    expect(second.color).toBeUndefined();

    const folders = await listVaultFolders();
    expect(folders.map((f) => f.id)).toEqual([first.id, second.id]);
  });

  it('renames an existing folder and ignores unknown IDs', async () => {
    const folder = await createVaultFolder('Drafts');
    await renameVaultFolder(folder.id, '  Archived Drafts  ');
    await renameVaultFolder('folder_nonexistent', 'Ignored');

    const folders = await listVaultFolders();
    expect(folders).toHaveLength(1);
    expect(folders[0]?.name).toBe('Archived Drafts');
  });

  it('saves sessions and moves them between folders and Unfiled (null)', async () => {
    const folder = await createVaultFolder('Q4 Audits');
    const session = makeSession({ id: 'sess_1', folderId: null });
    await saveVaultSession(session);

    let sessions = await listVaultSessions();
    expect(sessions[0]?.folderId).toBeNull();

    await moveSessionToFolder('sess_1', folder.id);
    sessions = await listVaultSessions();
    expect(sessions[0]?.folderId).toBe(folder.id);

    await moveSessionToFolder('sess_1', null);
    sessions = await listVaultSessions();
    expect(sessions[0]?.folderId).toBeNull();
  });

  it('deleting a folder preserves its sessions with folderId set to null', async () => {
    const targetFolder = await createVaultFolder('Clinical');
    const otherFolder = await createVaultFolder('Financial');

    await saveVaultSession(
      makeSession({ id: 'sess_a', timestamp: '2026-11-25T10:00:00.000Z', folderId: targetFolder.id }),
    );
    await saveVaultSession(
      makeSession({ id: 'sess_b', timestamp: '2026-11-25T11:00:00.000Z', folderId: targetFolder.id }),
    );
    await saveVaultSession(
      makeSession({ id: 'sess_c', timestamp: '2026-11-25T12:00:00.000Z', folderId: otherFolder.id }),
    );

    await deleteVaultFolder(targetFolder.id);

    const folders = await listVaultFolders();
    expect(folders.map((f) => f.id)).toEqual([otherFolder.id]);

    const sessions = await listVaultSessions();
    expect(sessions).toHaveLength(3);
    const byId = new Map(sessions.map((s) => [s.id, s]));
    expect(byId.get('sess_a')?.folderId).toBeNull();
    expect(byId.get('sess_b')?.folderId).toBeNull();
    expect(byId.get('sess_c')?.folderId).toBe(otherFolder.id);
  });
});
