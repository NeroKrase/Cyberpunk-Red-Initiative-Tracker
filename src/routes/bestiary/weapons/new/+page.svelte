<script lang="ts">
  import { goto } from "$app/navigation";
  import PageChrome from "$lib/PageChrome.svelte";
  import WeaponTemplateForm from "$lib/WeaponTemplateForm.svelte";
  import { createWeaponTemplate, type WeaponTemplateInput } from "$lib/store.svelte";

  function onSave(data: WeaponTemplateInput) {
    createWeaponTemplate(data);
    goto("/bestiary?tab=weapons");
  }

  function onCancel() {
    goto("/bestiary?tab=weapons");
  }
</script>

<PageChrome backHref="/bestiary" backLabel="Database" title="Register new weapon" faction="blue">
  <WeaponTemplateForm submitLabel="Register weapon" {onSave} {onCancel} />
</PageChrome>
