<script lang="ts">
	import { Map, MapControlContainer, MapScaleControl } from '#lib/registry/ui/map/index.js';
</script>

<Map class="size-full" viewport={{ center: [-122.4194, 37.7749], zoom: 12, bearing: 0, pitch: 0 }}>
	<MapControlContainer position="bottom-left">
		<MapScaleControl />
		<MapScaleControl unit="imperial" />
	</MapControlContainer>
</Map>
