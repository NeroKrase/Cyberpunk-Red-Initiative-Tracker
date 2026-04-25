<script lang="ts">
  import { goto } from "$app/navigation";
  import StatBlockForm from "$lib/StatBlockForm.svelte";
  import { createTemplate } from "$lib/store.svelte";
  import type { EnemyStatBlock } from "$lib/types";

  function onSave(data: EnemyStatBlock) {
    createTemplate(data);
    goto("/bestiary");
  }

  function onCancel() {
    goto("/bestiary");
  }
</script>

<p><a href="/bestiary">&larr; Database</a></p>
<h1>New enemy template</h1>

<StatBlockForm submitLabel="Create template" {onSave} {onCancel} />
