<!-- src/routes/login/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	
	let { form } = $props();
	
	let loading = false;
</script>

<svelte:head>
	<title>Login - Bookmark Manager</title>
</svelte:head>

<main class="login-container">
	<div class="login-card">
		<div class="login-header">
			<h1>📚 Bookmark Manager</h1>
			<p>Sign in to access your bookmarks</p>
		</div>
		
		<form 
			method="POST" 
			action="?/login"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					loading = false;
					if (result.type === 'redirect') {
						goto('/');
					} else {
						update();
					}
				};
			}}
		>
			<div class="form-group">
				<label for="username">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					required
					placeholder="Enter your username"
					class="form-input"
				/>
			</div>
			
			<div class="form-group">
				<label for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					placeholder="Enter your password"
					class="form-input"
				/>
			</div>
			
			{#if form?.error}
				<div class="error-message">
					{form.error}
				</div>
			{/if}
			
			<button type="submit" disabled={loading} class="login-btn">
				{loading ? 'Signing in...' : 'Sign In'}
			</button>
		</form>
		
		<div class="login-footer">
			<p>Don't have an account? <a href="/register">Create one</a></p>
		</div>
	</div>
</main>

<style>
	/* Only apply these styles to the login page */
	.login-container {
		color: #e0e0e0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
		margin: 0;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 400px;
		padding: 2rem;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		margin: auto;
	}

	.login-card {
		background: rgba(30, 30, 30, 0.9);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 3rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		animation: slideIn 0.3s ease-out;
		width: 100%;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-header h1 {
		font-size: 2rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.login-header p {
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		font-size: 1rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		color: #fff;
		font-weight: 500;
	}

	.form-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		font-size: 1rem;
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		transition: all 0.3s ease;
		box-sizing: border-box;
	}

	.form-input:focus {
		outline: none;
		border-color: #4ecdc4;
		box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
		transform: scale(1.02);
	}

	.form-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.error-message {
		background: rgba(231, 76, 60, 0.2);
		border: 1px solid rgba(231, 76, 60, 0.4);
		color: #e74c3c;
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.login-btn {
		width: 100%;
		padding: 0.75rem;
		border: none;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		background: linear-gradient(135deg, #4ecdc4, #44a08d);
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		margin-bottom: 1.5rem;
	}

	.login-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(78, 205, 196, 0.4);
	}

	.login-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.login-footer {
		text-align: center;
	}

	.login-footer p {
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
	}

	.login-footer a {
		color: #4ecdc4;
		text-decoration: none;
		font-weight: 500;
		transition: color 0.3s ease;
	}

	.login-footer a:hover {
		color: #ff6b6b;
	}
</style>