/** @jsxImportSource theme-ui */
import React from "react";
import { Container, Paragraph, Heading, Link } from "theme-ui";

const headingSX = {
  fontSize: "65px",
  mb: 3,
  mt: 5
};

const paragraphSX = {
  fontSize: "24px",
  maxWidth: ["unset", "unset"],
  mb: 6
};

export const DisclaimerPage: React.FC = () => (
  <Container variant="column" sx={{ pt: 4 }}>
    <Container variant="center" sx={{ width: ["100%", "100%", "80%"] }}>
      <Heading as="h1" sx={headingSX}>
        Disclaimer
      </Heading>

      <Paragraph sx={paragraphSX}>
        Risk Warning: Don’t invest in crypto unless you’re prepared to lose all the money you invest. This is a
        high-risk investment and you should not expect to be protected if something goes wrong.
      </Paragraph>

      <Heading as="h2" sx={headingSX}>
        General Disclaimer
      </Heading>

      <Paragraph sx={paragraphSX}>
        The information provided on HLiquity.finance is for informational purposes only and does not constitute
        financial, investment, or legal advice. Any actions taken based on the information on this site are strictly at
        your own risk. HLiquity.finance and its affiliates are not responsible for any losses incurred.
      </Paragraph>

      <Heading as="h2" sx={headingSX}>
        No Investment Advice
      </Heading>

      <Paragraph sx={paragraphSX}>
        <Link href="https://hliquity.finance/" target="_blank">
          HLiquity.finance
        </Link>

        {" "}

        does not offer investment advice. It is crucial to conduct your own research and due diligence
        before making any investment decisions in the cryptocurrency space.
      </Paragraph>

      <Heading as="h2" sx={headingSX}>
        Liability
      </Heading>

      <Paragraph sx={paragraphSX}>
        <Link href="https://hliquity.finance/" target="_blank">
          HLiquity.finance
        </Link>

        {" "}

        is not liable for any losses, direct or indirect, that may arise from using the information
        provided on this site or from participating in any Web3 projects discussed.
      </Paragraph>

      <Heading as="h2" sx={headingSX}>
        No Warranties
      </Heading>

      <Paragraph sx={paragraphSX}>
        <Link href="https://hliquity.finance/" target="_blank">
          HLiquity.finance
        </Link>

        {" "}

        makes no representations or warranties of any kind, express or implied, regarding the accuracy,
        completeness, or timeliness of the information on this site.
      </Paragraph>

      <Heading as="h2" sx={headingSX}>
        Your Responsibility
      </Heading>

      <Paragraph sx={paragraphSX}>
        It is your responsibility to evaluate all information provided and make informed investment decisions based on
        your own judgment and risk tolerance.
      </Paragraph>
    </Container>
  </Container>
);