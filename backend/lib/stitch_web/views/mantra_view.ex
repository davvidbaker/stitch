defmodule StitchWeb.MantraView do
  use StitchWeb, :view
  alias StitchWeb.MantraView

  def render("index.json", %{mantras: mantras}) do
    %{data: render_many(mantras, MantraView, "mantra.json")}
  end

  def render("show.json", %{mantra: mantra}) do
    %{data: render_one(mantra, MantraView, "mantra.json")}
  end

  def render("mantra.json", %{mantra: mantra}) do
    %{id: mantra.id,
      name: mantra.name}
  end
end