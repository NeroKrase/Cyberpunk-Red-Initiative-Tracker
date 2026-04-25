<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import StatBlockForm from "$lib/StatBlockForm.svelte";
  import { getTemplate, updateTemplate } from "$lib/store.svelte";
  import type { EnemyStatBlock } from "$lib/types";

  const template = $derived(getTemplate(page.params.templateId!));

  function onSave(data: EnemyStatBlock) {
    if (!template) return;
    updateTemplate(template.id, data);
    goto("/bestiary");
  }

  function onCancel() {
    goto("/bestiary");
  }
</script>

<p><a href="/bestiary">&larr; Database</a></p>

{#if !template}
  <h1>Template not found</h1>
{:else}
  <h1>Edit {template.name || "template"}</h1>
  <StatBlockForm
    initial={template}
    submitLabel="Save changes"
    {onSave}
    {onCancel}
  />
{/if}
