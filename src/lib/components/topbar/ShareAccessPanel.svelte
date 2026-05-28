<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { RESOURCE_ACCESS_TPYE, type ResourceAccess } from '$lib/constants/page';

  export interface ManageAccessConfig {
    resourceType: 'page' | 'collection';
    resourceKey: string;
    access: ResourceAccess;
  }

  interface ShareRow {
    grantee_type: 'domain' | 'group';
    grantee_id: string;
    label: string;
    access_role: 'viewer' | 'editor' | null;
    member_count: number | null;
  }

  interface MemberRow {
    user_id: string;
    email: string;
    username: string;
    access_role: 'viewer' | 'editor';
  }

  interface Props {
    config: ManageAccessConfig;
    open: boolean;
    onSaveSuccess?: () => void;
    onSaveError?: (message: string) => void;
  }

  let { config, open, onSaveSuccess, onSaveError }: Props = $props();

  let loading = $state(false);
  let errorMsg = $state<string | null>(null);
  let accessLevel = $state<ResourceAccess>(config.access);

  let shares = $state<ShareRow[]>([]);
  let sharedUsers = $state<MemberRow[]>([]);
  let defaultGroupId = $state<string | null>(null);

  let shareToInput = $state('');
  let shareToRole = $state<'viewer' | 'editor'>('viewer');
  let shareToUserInput = $state('');
  let shareToUserRole = $state<'viewer' | 'editor'>('viewer');

  const sharesApi = $derived(
    config.resourceType === 'page'
      ? `/api/pub/${encodeURIComponent(config.resourceKey)}/shares`
      : `/api/collection/${encodeURIComponent(config.resourceKey)}/shares`
  );

  const accessApi = $derived(
    config.resourceType === 'page'
      ? `/api/pub/${encodeURIComponent(config.resourceKey)}`
      : `/api/collection/${encodeURIComponent(config.resourceKey)}`
  );

  async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!res.ok) {
      const text = await res.text();
      let message = text;
      try {
        const data = JSON.parse(text) as { message?: string };
        message = data.message ?? text;
      } catch {
        /* keep text */
      }
      throw new Error(message || `Request failed (${res.status})`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async function loadAll() {
    loading = true;
    errorMsg = null;
    try {
      const shareData = await apiJson<{
        shares: ShareRow[];
        shared_users: MemberRow[];
        default_group_id: string | null;
      }>(sharesApi);
      shares = shareData.shares;
      sharedUsers = shareData.shared_users ?? [];
      defaultGroupId = shareData.default_group_id ?? null;
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (open) {
      accessLevel = config.access;
      void loadAll();
    }
  });

  async function saveAccessLevel() {
    errorMsg = null;
    try {
      await apiJson(accessApi, {
        method: 'PUT',
        body: JSON.stringify({ access: accessLevel }),
      });
      await invalidateAll();
      onSaveSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errorMsg = message;
      onSaveError?.(message);
    }
  }

  async function shareToDomain() {
    if (!shareToInput.trim()) return;
    errorMsg = null;
    try {
      const data = await apiJson<{
        shares: ShareRow[];
        shared_users: MemberRow[];
        default_group_id: string | null;
      }>(sharesApi, {
        method: 'POST',
        body: JSON.stringify({ domain: shareToInput, access_role: shareToRole }),
      });
      shares = data.shares;
      sharedUsers = data.shared_users ?? [];
      defaultGroupId = data.default_group_id ?? null;
      shareToInput = '';
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  function onShareToKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void shareToDomain();
    }
  }

  async function removeShareRow(row: ShareRow) {
    errorMsg = null;
    try {
      await apiJson(sharesApi, {
        method: 'DELETE',
        body: JSON.stringify({ grantee_type: row.grantee_type, grantee_id: row.grantee_id }),
      });
      shares = shares.filter(
        (s) => !(s.grantee_type === row.grantee_type && s.grantee_id === row.grantee_id)
      );
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  async function shareToUser() {
    if (!shareToUserInput.trim()) return;
    errorMsg = null;
    try {
      const data = await apiJson<{
        shares: ShareRow[];
        shared_users: MemberRow[];
        default_group_id: string | null;
      }>(sharesApi, {
        method: 'POST',
        body: JSON.stringify({ email: shareToUserInput, access_role: shareToUserRole }),
      });
      shares = data.shares;
      sharedUsers = data.shared_users ?? [];
      defaultGroupId = data.default_group_id ?? null;
      shareToUserInput = '';
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  function onShareToUserKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void shareToUser();
    }
  }

  async function removeSharedUser(member: MemberRow) {
    if (!defaultGroupId) return;
    errorMsg = null;
    try {
      await apiJson(
        `/api/access/groups/${encodeURIComponent(defaultGroupId)}/members/${encodeURIComponent(member.user_id)}`,
        { method: 'DELETE' }
      );
      sharedUsers = sharedUsers.filter((u) => u.user_id !== member.user_id);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  function permissionVerb(role: 'viewer' | 'editor' | null): string {
    return role === 'editor' ? 'can edit' : 'can view';
  }

  const domainShares = $derived(shares.filter((s) => s.grantee_type === 'domain'));
</script>

<section class="access-panel" aria-label="Access management">
  <div class="access-head">
    <h4>Access control</h4>
    <p>Manage visibility and who can read or edit when private.</p>
  </div>

  {#if errorMsg}
    <p class="access-error" role="alert">{errorMsg}</p>
  {/if}

  <label class="access-field">
    <span>Visibility</span>
    <div class="access-row">
      <select bind:value={accessLevel} disabled={loading}>
        {#each RESOURCE_ACCESS_TPYE as level}
          <option value={level}>{level}</option>
        {/each}
      </select>
      <button type="button" class="access-btn" onclick={saveAccessLevel} disabled={loading}>
        Save
      </button>
    </div>

    {#if accessLevel === 'private' && (domainShares.length > 0 || sharedUsers.length > 0)}
      <ul class="visibility-share-list">
        {#each domainShares as row (row.grantee_id)}
          <li class="visibility-share-item">
            <p class="visibility-share-hint">
              Users with a <strong>{row.label}</strong> email address {permissionVerb(
                row.access_role
              )}.
            </p>
            <button type="button" class="access-link" onclick={() => removeShareRow(row)}
              >Remove</button
            >
          </li>
        {/each}
        {#each sharedUsers as user (user.user_id)}
          <li class="visibility-share-item">
            <p class="visibility-share-hint">
              <strong>{user.email}</strong>
              {permissionVerb(user.access_role)}.
            </p>
            <button type="button" class="access-link" onclick={() => removeSharedUser(user)}
              >Remove</button
            >
          </li>
        {/each}
      </ul>
    {/if}
  </label>

  {#if accessLevel === 'private'}
    <div class="access-section">
      <h5>Share to domain</h5>

      <div class="share-to-row">
        <div class="share-to-combo">
          <input
            type="text"
            placeholder="@domain"
            bind:value={shareToInput}
            onkeydown={onShareToKeydown}
            disabled={loading}
            aria-label="Email domain"
          />
          <select bind:value={shareToRole} disabled={loading} aria-label="Permission">
            <option value="viewer">Can view</option>
            <option value="editor">Can edit</option>
          </select>
        </div>
        <button
          type="button"
          class="access-btn"
          onclick={shareToDomain}
          disabled={!shareToInput.trim() || loading}
        >
          Add
        </button>
      </div>

      <h5 class="share-to-subhead">Share to user</h5>

      <div class="share-to-row">
        <div class="share-to-combo">
          <input
            type="email"
            placeholder="user's email"
            bind:value={shareToUserInput}
            onkeydown={onShareToUserKeydown}
            disabled={loading}
            aria-label="User email"
          />
          <select bind:value={shareToUserRole} disabled={loading} aria-label="Permission">
            <option value="viewer">Can view</option>
            <option value="editor">Can edit</option>
          </select>
        </div>
        <button
          type="button"
          class="access-btn"
          onclick={shareToUser}
          disabled={!shareToUserInput.trim() || loading}
        >
          Add
        </button>
      </div>
    </div>
  {/if}
</section>

<style>
  .access-panel {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }

  .access-head h4 {
    margin: 0 0 4px;
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .access-head p {
    margin: 0 0 12px;
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .access-error {
    margin: 0 0 12px;
    font-size: 12px;
    color: #b91c1c;
  }

  .access-field {
    display: block;
    margin-bottom: 16px;
  }

  .access-field > span {
    display: block;
    margin-bottom: 6px;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .visibility-share-list {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .visibility-share-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface, #fff) 70%, transparent);
    border: 1px solid var(--border);
  }

  .visibility-share-hint {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .visibility-share-hint strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .access-section {
    margin-bottom: 12px;
  }

  .access-section h5 {
    margin: 0 0 10px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .share-to-subhead {
    margin: 16px 0 10px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .share-to-row {
    display: flex;
    gap: 8px;
    align-items: stretch;
    margin-bottom: 12px;
  }

  .share-to-combo {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface, #fff);
    overflow: hidden;
    box-shadow: var(--shadow-card);
  }

  .share-to-combo input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    padding: 11px 14px;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-primary);
    outline: none;
  }

  .share-to-combo input::placeholder {
    color: var(--text-tertiary);
  }

  .share-to-combo select {
    border: none;
    border-left: 1px solid var(--border);
    background: transparent;
    padding: 11px 1.25rem 11px 8px;
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--text-primary);
    cursor: pointer;
    outline: none;
    flex: 0 0 5.5rem;
    width: 5.5rem;
    max-width: 5.5rem;
  }

  .share-to-row .access-btn {
    align-self: stretch;
    padding-left: 16px;
    padding-right: 16px;
  }

  .access-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .access-row select,
  .access-row input {
    flex: 1 1 120px;
    min-width: 0;
    font-family: var(--font-sans);
    font-size: 12px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface, #fff);
    color: var(--text-primary);
  }

  .access-btn {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    padding: 8px 12px;
    border-radius: 999px;
    border: none;
    background: var(--text-primary);
    color: var(--bg);
    cursor: pointer;
    flex-shrink: 0;
  }

  .access-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .access-link {
    border: none;
    background: none;
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    flex-shrink: 0;
  }
</style>
