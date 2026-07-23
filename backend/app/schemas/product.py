from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ProductName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
]
Description = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
]
Category = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
ShortField = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
SizeField = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
]
ImageUrl = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    category: str
    price: float
    image_url: str
    roast_level: str
    origin: str
    size: str
    active: bool


class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: ProductName
    description: Description
    category: Category
    price: float = Field(ge=0, le=10000)
    size: SizeField
    image_url: ImageUrl = ""
    roast_level: ShortField = ""
    origin: ShortField = ""
    active: bool = True


class ProductUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: ProductName
    description: Description
    category: Category
    price: float = Field(ge=0, le=10000)
    image_url: ImageUrl = ""
    roast_level: ShortField = ""
    origin: ShortField = ""
    size: SizeField
    active: bool


class ProductActiveUpdate(BaseModel):
    active: bool
