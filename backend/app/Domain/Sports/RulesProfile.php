<?php

namespace App\Domain\Sports;

class RulesProfile
{
    public string $id;
    public string $discipline;
    public string $officialBody;
    public string $rulesEdition;
    public string $category;
    public array $parameters;

    public function __construct(
        string $id,
        string $discipline,
        string $officialBody,
        string $rulesEdition,
        string $category,
        array $parameters = []
    ) {
        $this->id = $id;
        $this->discipline = $discipline;
        $this->officialBody = $officialBody;
        $this->rulesEdition = $rulesEdition;
        $this->category = $category;
        $this->parameters = $parameters;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'discipline' => $this->discipline,
            'official_body' => $this->officialBody,
            'rules_edition' => $this->rulesEdition,
            'category' => $this->category,
            'parameters' => $this->parameters,
        ];
    }
}
