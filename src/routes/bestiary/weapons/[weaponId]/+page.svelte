<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import WeaponTemplateForm from "$lib/WeaponTemplateForm.svelte";
  import {
    getWeaponTemplate,
    updateWeaponTemplate,
    type WeaponTemplateInput,
  } from "$lib/store.svelte";

  const template = $derived(getWeaponTemplate(page.params.weaponId!));

  function onSave(data: WeaponTemplateInput) {
    if (!template) return;
    updateWeaponTemplate(template.id, data);
    goto("/bestiary");
  }

  function onCancel() {
    goto("/bestiary");
  }
</script>

<p><a href="/bestiary">&larr; Database</a></p>

{#if !template}
  <h1>Weapon not found</h1>
{:else}
  <h1>Edit {template.name || "weapon"}</h1>
  <WeaponTemplateForm
    initial={template}
    submitLabel="Save changes"
    {onSave}
    {onCancel}
  />
{/if}
