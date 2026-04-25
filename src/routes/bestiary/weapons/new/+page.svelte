<script lang="ts">
  import { goto } from "$app/navigation";
  import WeaponTemplateForm from "$lib/WeaponTemplateForm.svelte";
  import { createWeaponTemplate, type WeaponTemplateInput } from "$lib/store.svelte";

  function onSave(data: WeaponTemplateInput) {
    createWeaponTemplate(data);
    goto("/bestiary");
  }

  function onCancel() {
    goto("/bestiary");
  }
</script>

<p><a href="/bestiary">&larr; Database</a></p>
<h1>New weapon template</h1>

<WeaponTemplateForm submitLabel="Create template" {onSave} {onCancel} />
