/** @jsxImportSource theme-ui */
import React from "react";
import { Container, Paragraph, Heading, Text } from "theme-ui";

const headingSX = {
  fontSize: "65px",
  mb: 3,
  mt: 5
}

const paragraphSX = {
  fontSize: "24px",
  maxWidth: ["unset", "unset"],
  mb: 6
}

export const ImprintPage: React.FC = () => (
  <Container variant="column" sx={{ pt: 4 }}>
    <Container variant="center" sx={{ width: ["100%", "100%", "80%"] }}>
      <Heading as="h1" sx={headingSX}>
        Imprint
      </Heading>
      <Paragraph sx={paragraphSX}>
        Blokk is a Blockchain Tech and Web 3 solutions provider brand by Apps with love: <br />
        <Text sx={{ display: "block", mt: 3 }}>
          <strong>Apps with love AG</strong> <br />
          Landoltstrasse 63 <br />
          3007 Bern <br />
          Switzerland <br />
        </Text>
      </Paragraph>

      <Heading as="h2" sx={headingSX}>
        Commercial register entry
      </Heading>
      <Paragraph sx={paragraphSX}>
        Registered company name: Apps with love AG <br />
        VAT number: CHE-116.029.116<br />
        Commercial Register Office: Commercial Register Office of the Canton of Bern<br />
      </Paragraph>
      <Heading as="h2" sx={headingSX}>
        Liability disclaimer
      </Heading>
      <Paragraph sx={paragraphSX}>
        The author assumes no responsibility for the correctness, accuracy, timeliness, reliability and completeness of the information. Liability claims regarding damage caused by the use of any information provided, including any kind of information which is incomplete or incorrect, will therefore be rejected. All offers are non-binding. The author expressly reserves the right to change, supplement or delete parts of the pages or the entire site without prior notice or to cease publication temporarily or permanently.
      </Paragraph>
      <Heading as="h2" sx={headingSX}>
        Liability for links
      </Heading>
      <Paragraph sx={paragraphSX}>
        References and links to websites of third parties are outside our area of control: any responsibility for such websites is declined. Access and use of such websites is at the user's own risk.
      </Paragraph>
      <Heading as="h2" sx={headingSX}>
        Copyrights
      </Heading>
      <Paragraph sx={paragraphSX}>
        The copyright and all other rights to content, images, photos or other files on the website belong exclusively to Apps with love AG or the specifically named rights holders. The written consent of the copyright holders must be obtained in advance for the reproduction of any elements.
      </Paragraph>
    </Container>
  </Container>
);