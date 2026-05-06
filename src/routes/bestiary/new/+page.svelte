<script lang="ts">
  import { goto } from "$app/navigation";
  import PageChrome from "$lib/PageChrome.svelte";
  import StatBlockForm from "$lib/StatBlockForm.svelte";
  import { createTemplate } from "$lib/store.svelte";
  import type { EnemyStatBlock } from "$lib/types";

  async function onSave(data: EnemyStatBlock) {
    await createTemplate(data);
    goto("/bestiary");
  }

  function onCancel() {
    goto("/bestiary");
  }
</script>

<PageChrome backHref="/bestiary" backLabel="Database" title="New perp record" faction="blue">
  <StatBlockForm submitLabel="File record" {onSave} {onCancel} />
</PageChrome>
