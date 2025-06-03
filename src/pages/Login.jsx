export default function Login() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Connexion</h1>
      <input type="email" placeholder="Email" className="mb-2" />
      <input type="password" placeholder="Mot de passe" className="mb-4" />
      <button className="bg-blue-600 text-white px-4 py-2 rounded">Connexion</button>
    </div>
  )
}
