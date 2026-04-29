<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import PageChrome from "$lib/PageChrome.svelte";
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
    goto("/bestiary?tab=weapons");
  }

  function onCancel() {
    goto("/bestiary?tab=weapons");
  }
</script>

<PageChrome
  backHref="/bestiary"
  backLabel="Database"
  title={template ? `Edit ${template.name || "weapon"}` : "Weapon not found"}
  faction="blue"
>
  {#if template}
    <WeaponTemplateForm
      initial={template}
      submitLabel="Save changes"
      {onSave}
      {onCancel}
    />
  {/if}
</PageChrome>
