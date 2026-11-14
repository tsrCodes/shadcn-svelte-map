<script lang="ts">
	import { Map, MapControlContainer } from '#lib/registry/ui/map/index.js';
	import { MapDrawControl } from '#lib/registry/ui/map-draw/index.js';
</script>

<Map class="size-full" viewport={{ center: [-122.4194, 37.7749], zoom: 13, bearing: 0, pitch: 0 }}>
	<MapControlContainer position="bottom-left">
		<MapDrawControl modes={['polygon', 'rectangle', 'circle']} orientation="horizontal" />
	</MapControlContainer>
</Map>
