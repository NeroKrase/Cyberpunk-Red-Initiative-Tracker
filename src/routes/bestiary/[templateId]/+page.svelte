<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import PageChrome from "$lib/PageChrome.svelte";
  import StatBlockForm from "$lib/StatBlockForm.svelte";
  import { getTemplate, updateTemplate } from "$lib/store.svelte";
  import type { EnemyStatBlock } from "$lib/types";

  const template = $derived(getTemplate(page.params.templateId!));

  async function onSave(data: EnemyStatBlock) {
    if (!template) return;
    await updateTemplate(template.id, data);
    goto("/bestiary");
  }

  function onCancel() {
    goto("/bestiary");
  }
</script>

<PageChrome
  backHref="/bestiary"
  backLabel="Database"
  title={template ? `Edit ${template.name || "record"}` : "Record not found"}
  faction="blue"
>
  {#if template}
    <StatBlockForm
      initial={template}
      submitLabel="Save changes"
      {onSave}
      {onCancel}
    />
  {/if}
</PageChrome>
