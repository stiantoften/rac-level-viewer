// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import '@webgpu/types'

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	interface Navigator {
		readonly gpu: GPU;
	}

}


export {};
