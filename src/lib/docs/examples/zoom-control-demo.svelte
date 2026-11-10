<script lang="ts">
	import { Map, MapControlContainer, MapZoomControl } from '#lib/registry/ui/map/index.js';
</script>

<Map class="size-full" viewport={{ center: [2.3522, 48.8566], zoom: 11, bearing: 0, pitch: 0 }}>
	<MapControlContainer position="top-right">
		<MapZoomControl />
	</MapControlContainer>
</Map>
