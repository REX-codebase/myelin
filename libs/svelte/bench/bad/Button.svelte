<script lang="ts">
	import { afterUpdate } from 'svelte';

	export let variant: 'primary' | 'ghost' = 'primary';

	afterUpdate(() => {
		console.log('button updated');
	});
</script>

<button class="btn btn-{variant} {$$props.class ?? ''}" {...$$restProps}>
	<slot />
</button>
