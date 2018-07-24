defmodule SteadyWeb.FallbackController do
  @moduledoc """
  Translates controller action results into valid `Plug.Conn` responses.

  See `Phoenix.Controller.action_fallback/1` for more details.
  """
  use SteadyWeb, :controller

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    IO.puts "\n🔥conn"
    IO.inspect conn
    conn
    |> put_status(:unprocessable_entity)
    |> render(SteadyWeb.ChangesetView, "error.json", changeset: changeset)
  end

  def call(conn, {:error, :not_found}) do
    IO.puts "\n🔥conn"
    IO.inspect conn

    conn
    |> put_status(:not_found)
    |> render(SteadyWeb.ErrorView, :"404")
  end
end
